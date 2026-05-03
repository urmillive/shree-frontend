import React, { useEffect, useMemo, useState } from "react";
import { Alert, Autocomplete, Box, Button, Chip, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import AdminNavbar from "../components/AdminNavbar";

const pageBg = "#ffffff";
const accent = "#ab8a48";

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

const AdminProductListSectionCreate = () => {
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  const [createForm, setCreateForm] = useState({ title: "", subtitle: "", displayOrder: 0, isActive: true });
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [productSearchInput, setProductSearchInput] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  useEffect(() => {
    if (!isAdminAllowed) return;
    const controller = new AbortController();
    const run = async () => {
      setLoadingProducts(true);
      try {
        const search = productSearchInput.trim();
        const endpoint = search
          ? `/admin/products?search=${encodeURIComponent(search)}&page=1&limit=20&order=desc`
          : "/admin/products?page=1&limit=20&order=desc";
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

  const handleCreateSection = async () => {
    const ids = Array.from(new Set(selectedProducts.map((item) => getProductId(item)).filter(Boolean)));
    if (!createForm.title.trim()) {
      setFeedback({ type: "error", message: "Title is required." });
      return;
    }
    if (!ids.length) {
      setFeedback({ type: "error", message: "Select at least one product." });
      return;
    }
    setCreating(true);
    setFeedback({ type: "", message: "" });
    try {
      const { data } = await client.post("/admin/sections", {
        title: createForm.title.trim(),
        subtitle: createForm.subtitle.trim() || undefined,
        type: "product_list",
        displayOrder: Number(createForm.displayOrder) || 0,
        isActive: Boolean(createForm.isActive),
      });
      const created = data?.data?.section ?? data?.section ?? data?.data ?? data;
      const sectionId = created?._id ?? created?.id ?? "";
      if (!sectionId) {
        throw new Error("Section created but id not found.");
      }
      await client.post(`/admin/sections/${encodeURIComponent(String(sectionId))}/products`, { ids });
      navigate(`/admin/homepage-cms/product-list-sections/${encodeURIComponent(String(sectionId))}`);
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.response?.data?.message || error?.message || "Failed to create product list section.",
      });
    } finally {
      setCreating(false);
    }
  };

  if (!isAdminAllowed) {
    return (
      <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2, bgcolor: pageBg }}>
        <Typography color="text.secondary">You do not have access to this page.</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate("/admin/dashboard")}>
          Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1120, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Homepage CMS", to: "/admin/homepage-cms" },
            { label: "Product List Sections", to: "/admin/homepage-cms/product-list-sections" },
            { label: "Create" },
          ]}
        />
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>
            Create Product List Section
          </Typography>
          <Button variant="text" sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }} onClick={() => navigate("/admin/homepage-cms/product-list-sections")}>
            Back to list
          </Button>
        </Stack>

        {feedback.message ? (
          <Alert severity={feedback.type === "success" ? "success" : "error"} sx={{ mb: 2 }}>
            {feedback.message}
          </Alert>
        ) : null}

        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
          <Stack spacing={1.25}>
            <TextField label="Title" size="small" required value={createForm.title} onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))} />
            <TextField label="Subtitle" size="small" value={createForm.subtitle} onChange={(event) => setCreateForm((prev) => ({ ...prev, subtitle: event.target.value }))} />
            <TextField
              label="Display Order"
              type="number"
              size="small"
              value={createForm.displayOrder}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, displayOrder: event.target.value }))}
            />
            <TextField
              select
              label="Status"
              size="small"
              value={createForm.isActive ? "active" : "inactive"}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, isActive: event.target.value === "active" }))}
            >
              <MenuItem value="active">active</MenuItem>
              <MenuItem value="inactive">inactive</MenuItem>
            </TextField>
            <Autocomplete
              multiple
              options={productOptions}
              loading={loadingProducts}
              value={selectedProducts}
              onChange={(_, newValue) => setSelectedProducts(newValue)}
              inputValue={productSearchInput}
              onInputChange={(_, newInputValue) => setProductSearchInput(newInputValue)}
              isOptionEqualToValue={(option, value) => getProductId(option) === getProductId(value)}
              getOptionLabel={(option) => getProductLabel(option)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip {...getTagProps({ index })} key={`${getProductId(option)}-${index}`} label={getProductLabel(option)} size="small" />
                ))
              }
              renderInput={(params) => <TextField {...params} label="Search and select products" size="small" helperText="List + search both use product API." />}
            />
            <Button variant="contained" onClick={handleCreateSection} disabled={creating} sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
};

export default AdminProductListSectionCreate;
