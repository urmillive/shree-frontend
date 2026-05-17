import React, { useEffect, useMemo, useState } from "react";
import { Alert, Autocomplete, Box, Button, Chip, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import { getApiErrorMessage } from "../../utils/apiError";
import AdminNavbar from "../components/AdminNavbar";

const pageBg = "#ffffff";
const accent = "#ab8a48";

const normalizeSection = (payload) => {
  const root = payload?.data ?? payload;
  if (!root || typeof root !== "object") return null;
  return root.section ?? root;
};

const normalizeProducts = (payload) => {
  const levelOne = payload?.data ?? payload;
  if (!levelOne) return [];
  const list = levelOne.products ?? levelOne.items ?? levelOne.data ?? levelOne;
  return Array.isArray(list) ? list : [];
};

const getProductId = (product) => String(product?._id || product?.id || "").trim();
const getProductLabel = (product) => {
  const name = String(product?.name || product?.title || product?.productName || "").trim();
  const sku = String(product?.sku || "").trim();
  const id = getProductId(product);
  if (name && sku) return `${name} (${sku})`;
  if (name) return name;
  if (sku) return `SKU: ${sku}`;
  return id || "Unnamed product";
};

const AdminProductListSectionEdit = () => {
  const navigate = useNavigate();
  const { sectionId = "" } = useParams();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [section, setSection] = useState(null);
  const [updateForm, setUpdateForm] = useState({ title: "", subtitle: "", displayOrder: 0, isActive: true });
  const [productOptions, setProductOptions] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]); // staged additions
  const [markedForRemoval, setMarkedForRemoval] = useState([]); // staged removals
  const [productSearchInput, setProductSearchInput] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [busy, setBusy] = useState({ update: false, deleteSection: false });

  const loadSection = async () => {
    if (!sectionId.trim()) return;
    setLoading(true);
    setFeedback({ type: "", message: "" });
    try {
      const { data } = await client.get(`/admin/sections/${encodeURIComponent(sectionId.trim())}`);
      const fetched = normalizeSection(data);
      setSection(fetched);
      if (fetched) {
        setUpdateForm({
          title: fetched?.title || "",
          subtitle: fetched?.subtitle || "",
          displayOrder: fetched?.displayOrder ?? 0,
          isActive: Boolean(fetched?.isActive),
        });
        setSelectedProducts([]);
        setMarkedForRemoval([]);
      }
    } catch (error) {
      setFeedback({ type: "error", message: getApiErrorMessage(error, "Failed to load section.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAllowed) loadSection();
  }, [isAdminAllowed, sectionId]);

  useEffect(() => {
    if (!isAdminAllowed) return;
    const controller = new AbortController();
    const run = async () => {
      setLoadingProducts(true);
      try {
        const search = productSearchInput.trim();
        const endpoint = search ? `/admin/products?search=${encodeURIComponent(search)}&page=1&limit=20&order=desc` : "/admin/products?page=1&limit=20&order=desc";
        const { data } = await client.get(endpoint, { signal: controller.signal });
        setProductOptions(normalizeProducts(data));
      } catch (error) {
        if (error?.name === "CanceledError" || error?.name === "AbortError") return;
        setProductOptions([]);
      } finally {
        setLoadingProducts(false);
      }
    };
    const timer = setTimeout(run, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isAdminAllowed, productSearchInput]);

  const withBusy = async (key, fn) => {
    setBusy((prev) => ({ ...prev, [key]: true }));
    setFeedback({ type: "", message: "" });
    try {
      await fn();
    } finally {
      setBusy((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleUpdate = async () => {
    await withBusy("update", async () => {
      try {
        const existingProductIds = (Array.isArray(section?.productIds) ? section.productIds : []).map((id) => String(id));
        const existingSet = new Set(existingProductIds);
        const idsToAdd = Array.from(
          new Set(selectedProducts.map((item) => getProductId(item)).filter((id) => id && !existingSet.has(id)))
        );
        const idsToRemove = Array.from(new Set(markedForRemoval.map((id) => String(id).trim()).filter(Boolean)));

        await client.put(`/admin/sections/${encodeURIComponent(sectionId.trim())}`, {
          title: updateForm.title.trim(),
          subtitle: updateForm.subtitle.trim(),
          displayOrder: Number(updateForm.displayOrder) || 0,
          isActive: Boolean(updateForm.isActive),
        });

        if (idsToAdd.length) {
          await client.post(`/admin/sections/${encodeURIComponent(sectionId.trim())}/products`, { ids: idsToAdd });
        }

        if (idsToRemove.length) {
          await Promise.all(
            idsToRemove.map((id) =>
              client.delete(`/admin/sections/${encodeURIComponent(sectionId.trim())}/products/${encodeURIComponent(id)}`)
            )
          );
        }

        setFeedback({
          type: "success",
          message: `Section updated. Added ${idsToAdd.length} product(s), removed ${idsToRemove.length} product(s).`,
        });
        await loadSection();
      } catch (error) {
        setFeedback({ type: "error", message: getApiErrorMessage(error, "Failed to update section.") });
      }
    });
  };

  const handleSoftDelete = async () => {
    if (!window.confirm("Soft delete this section?")) return;
    await withBusy("deleteSection", async () => {
      try {
        await client.delete(`/admin/sections/${encodeURIComponent(sectionId.trim())}`);
        navigate("/admin/homepage-cms/product-list-sections");
      } catch (error) {
        setFeedback({ type: "error", message: getApiErrorMessage(error, "Failed to delete section.") });
      }
    });
  };

  if (!isAdminAllowed) {
    return (
      <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2, bgcolor: pageBg }}>
        <Typography color="text.secondary">You do not have access to this page.</Typography>
      </Box>
    );
  }

  const isCorrectType = section?.type === "product_list";
  const existingProductIds = useMemo(() => (Array.isArray(section?.productIds) ? section.productIds.map((id) => String(id)) : []), [section]);
  const existingProductSet = useMemo(() => new Set(existingProductIds), [existingProductIds]);
  const activeProductIds = existingProductIds.filter((id) => !markedForRemoval.includes(id));
  const availableOptions = productOptions.filter((product) => !existingProductSet.has(getProductId(product)));

  const getExistingProductLabel = (id) => {
    const match = productOptions.find((item) => getProductId(item) === id);
    return match ? getProductLabel(match) : `Product ${id}`;
  };

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1120, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Homepage CMS", to: "/admin/homepage-cms" },
            { label: "Product List Sections", to: "/admin/homepage-cms/product-list-sections" },
            { label: "Edit" },
          ]}
        />
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>Edit Product List Section</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="text" sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }} onClick={() => navigate(`/admin/homepage-cms/product-list-sections/${encodeURIComponent(sectionId)}`)}>Back to details</Button>
            <Button variant="outlined" sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }} onClick={loadSection}>Refresh</Button>
            <Button variant="outlined" color="error" disabled={busy.deleteSection} sx={{ textTransform: "none", fontWeight: 700 }} onClick={handleSoftDelete}>{busy.deleteSection ? "Deleting..." : "Soft Delete"}</Button>
          </Stack>
        </Stack>

        {feedback.message ? <Alert severity={feedback.type === "success" ? "success" : "error"} sx={{ mb: 2 }}>{feedback.message}</Alert> : null}

        {loading ? (
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}><Typography color="text.secondary">Loading section...</Typography></Paper>
        ) : !section ? (
          <Alert severity="error">No section data found.</Alert>
        ) : !isCorrectType ? (
          <Alert severity="error">This section is not a product_list section.</Alert>
        ) : (
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
            <Stack spacing={1.25}>
              <TextField label="Title" size="small" value={updateForm.title} onChange={(event) => setUpdateForm((prev) => ({ ...prev, title: event.target.value }))} />
              <TextField label="Subtitle" size="small" value={updateForm.subtitle} onChange={(event) => setUpdateForm((prev) => ({ ...prev, subtitle: event.target.value }))} />
              <TextField label="Display Order" type="number" size="small" value={updateForm.displayOrder} onChange={(event) => setUpdateForm((prev) => ({ ...prev, displayOrder: event.target.value }))} />
              <TextField select label="Status" size="small" value={updateForm.isActive ? "active" : "inactive"} onChange={(event) => setUpdateForm((prev) => ({ ...prev, isActive: event.target.value === "active" }))}>
                <MenuItem value="active">active</MenuItem>
                <MenuItem value="inactive">inactive</MenuItem>
              </TextField>

              <Autocomplete
                multiple
                options={availableOptions}
                loading={loadingProducts}
                value={selectedProducts}
                onChange={(_, newValue) => {
                  setSelectedProducts(newValue);
                  const selectedIds = newValue.map((item) => getProductId(item));
                  setMarkedForRemoval((prev) => prev.filter((id) => !selectedIds.includes(id)));
                }}
                inputValue={productSearchInput}
                onInputChange={(_, newInputValue) => setProductSearchInput(newInputValue)}
                isOptionEqualToValue={(option, value) => getProductId(option) === getProductId(value)}
                getOptionLabel={(option) => getProductLabel(option)}
                renderTags={(value, getTagProps) => value.map((option, index) => <Chip {...getTagProps({ index })} key={`${getProductId(option)}-${index}`} label={getProductLabel(option)} size="small" />)}
                renderInput={(params) => <TextField {...params} label="Search and select products to add" size="small" helperText="This is staged. API runs only on Update Section." />}
              />

              <Typography sx={{ fontWeight: 700, color: "#1f2a24", mt: 0.75 }}>Current products</Typography>
              <Stack spacing={0.8}>
                {activeProductIds.length === 0 ? (
                  <Typography variant="body2" sx={{ color: "#6f7f77" }}>No products in this section.</Typography>
                ) : (
                  activeProductIds.map((id) => (
                    <Stack key={id} direction="row" justifyContent="space-between" alignItems="center" sx={{ border: `1px solid ${alpha("#0f3828", 0.1)}`, borderRadius: 1.2, px: 1.25, py: 0.8 }}>
                      <Typography variant="body2" sx={{ color: "#1f2a24", pr: 1 }}>{getExistingProductLabel(id)}</Typography>
                      <Button
                        size="small"
                        color="error"
                        variant="text"
                        sx={{ textTransform: "none", fontWeight: 700 }}
                        onClick={() => setMarkedForRemoval((prev) => (prev.includes(id) ? prev : [...prev, id]))}
                      >
                        Remove
                      </Button>
                    </Stack>
                  ))
                )}
              </Stack>

              {markedForRemoval.length > 0 ? (
                <Typography variant="body2" sx={{ color: "#a13a3a" }}>
                  {markedForRemoval.length} product(s) marked for removal. They will be deleted when you click Update Section.
                </Typography>
              ) : null}

              <Button variant="contained" onClick={handleUpdate} disabled={busy.update} sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}>
                {busy.update ? "Updating..." : "Update Section"}
              </Button>
            </Stack>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default AdminProductListSectionEdit;
