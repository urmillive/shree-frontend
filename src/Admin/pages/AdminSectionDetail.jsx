import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
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

const parseIdList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const AdminSectionDetail = () => {
  const navigate = useNavigate();
  const { sectionId = "" } = useParams();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [section, setSection] = useState(null);
  const [updateForm, setUpdateForm] = useState({ title: "", subtitle: "", displayOrder: 0, isActive: true });
  const [productIdsInput, setProductIdsInput] = useState("");
  const [categoryIdsInput, setCategoryIdsInput] = useState("");
  const [singleProductId, setSingleProductId] = useState("");
  const [singleCategoryId, setSingleCategoryId] = useState("");

  const [busy, setBusy] = useState({
    update: false,
    addProducts: false,
    addCategories: false,
    removeProduct: false,
    removeCategory: false,
    deleteSection: false,
  });

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
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Failed to load section."),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAllowed) {
      loadSection();
    }
  }, [isAdminAllowed, sectionId]);

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
        await client.put(`/admin/sections/${encodeURIComponent(sectionId.trim())}`, {
          title: updateForm.title.trim(),
          subtitle: updateForm.subtitle.trim(),
          displayOrder: Number(updateForm.displayOrder) || 0,
          isActive: Boolean(updateForm.isActive),
        });
        setFeedback({ type: "success", message: "Section updated successfully." });
        await loadSection();
      } catch (error) {
        setFeedback({
          type: "error",
          message: getApiErrorMessage(error, "Failed to update section."),
        });
      }
    });
  };

  const handleAddProducts = async () => {
    const ids = parseIdList(productIdsInput);
    if (!ids.length) {
      setFeedback({ type: "error", message: "Enter at least one product id." });
      return;
    }
    await withBusy("addProducts", async () => {
      try {
        await client.post(`/admin/sections/${encodeURIComponent(sectionId.trim())}/products`, { ids });
        setFeedback({ type: "success", message: "Products added to section." });
        setProductIdsInput("");
        await loadSection();
      } catch (error) {
        setFeedback({
          type: "error",
          message: getApiErrorMessage(error, "Failed to add products."),
        });
      }
    });
  };

  const handleRemoveProduct = async () => {
    const id = singleProductId.trim();
    if (!id) {
      setFeedback({ type: "error", message: "Enter product id to remove." });
      return;
    }
    await withBusy("removeProduct", async () => {
      try {
        await client.delete(`/admin/sections/${encodeURIComponent(sectionId.trim())}/products/${encodeURIComponent(id)}`);
        setFeedback({ type: "success", message: "Product removed from section." });
        setSingleProductId("");
        await loadSection();
      } catch (error) {
        setFeedback({
          type: "error",
          message: getApiErrorMessage(error, "Failed to remove product."),
        });
      }
    });
  };

  const handleAddCategories = async () => {
    const ids = parseIdList(categoryIdsInput);
    if (!ids.length) {
      setFeedback({ type: "error", message: "Enter at least one category id." });
      return;
    }
    await withBusy("addCategories", async () => {
      try {
        await client.post(`/admin/sections/${encodeURIComponent(sectionId.trim())}/categories`, { ids });
        setFeedback({ type: "success", message: "Categories added to section." });
        setCategoryIdsInput("");
        await loadSection();
      } catch (error) {
        setFeedback({
          type: "error",
          message: getApiErrorMessage(error, "Failed to add categories."),
        });
      }
    });
  };

  const handleRemoveCategory = async () => {
    const id = singleCategoryId.trim();
    if (!id) {
      setFeedback({ type: "error", message: "Enter category id to remove." });
      return;
    }
    await withBusy("removeCategory", async () => {
      try {
        await client.delete(`/admin/sections/${encodeURIComponent(sectionId.trim())}/categories/${encodeURIComponent(id)}`);
        setFeedback({ type: "success", message: "Category removed from section." });
        setSingleCategoryId("");
        await loadSection();
      } catch (error) {
        setFeedback({
          type: "error",
          message: getApiErrorMessage(error, "Failed to remove category."),
        });
      }
    });
  };

  const handleSoftDelete = async () => {
    if (!window.confirm("Soft delete this section?")) return;
    await withBusy("deleteSection", async () => {
      try {
        await client.delete(`/admin/sections/${encodeURIComponent(sectionId.trim())}`);
        navigate("/admin/homepage-cms/sections");
      } catch (error) {
        setFeedback({
          type: "error",
          message: getApiErrorMessage(error, "Failed to delete section."),
        });
      }
    });
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

  const productIds = Array.isArray(section?.productIds) ? section.productIds : [];
  const categoryIds = Array.isArray(section?.categoryIds) ? section.categoryIds : [];
  const sectionType = section?.type || "-";

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1120, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Homepage CMS", to: "/admin/homepage-cms" },
            { label: "Sections", to: "/admin/homepage-cms/sections" },
            { label: "Section Detail" },
          ]}
        />
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>
            Section Detail
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="text" sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }} onClick={() => navigate("/admin/homepage-cms/sections")}>
              Back to list
            </Button>
            <Button variant="outlined" sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }} onClick={loadSection}>
              Refresh
            </Button>
            <Button variant="outlined" color="error" disabled={busy.deleteSection} sx={{ textTransform: "none", fontWeight: 700 }} onClick={handleSoftDelete}>
              {busy.deleteSection ? "Deleting..." : "Soft Delete"}
            </Button>
          </Stack>
        </Stack>

        {feedback.message ? (
          <Alert severity={feedback.type === "success" ? "success" : "error"} sx={{ mb: 2 }}>
            {feedback.message}
          </Alert>
        ) : null}

        {loading ? (
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
            <Typography color="text.secondary">Loading section...</Typography>
          </Paper>
        ) : !section ? (
          <Alert severity="error">No section data found.</Alert>
        ) : (
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
                <Typography sx={{ fontWeight: 700, color: "#1f2a24", mb: 1.5 }}>Edit section</Typography>
                <Stack spacing={1.25}>
                  <TextField label="Title" size="small" value={updateForm.title} onChange={(event) => setUpdateForm((prev) => ({ ...prev, title: event.target.value }))} />
                  <TextField label="Subtitle" size="small" value={updateForm.subtitle} onChange={(event) => setUpdateForm((prev) => ({ ...prev, subtitle: event.target.value }))} />
                  <TextField label="Display Order" type="number" size="small" value={updateForm.displayOrder} onChange={(event) => setUpdateForm((prev) => ({ ...prev, displayOrder: event.target.value }))} />
                  <TextField
                    select
                    label="Status"
                    size="small"
                    value={updateForm.isActive ? "active" : "inactive"}
                    onChange={(event) => setUpdateForm((prev) => ({ ...prev, isActive: event.target.value === "active" }))}
                  >
                    <MenuItem value="active">active</MenuItem>
                    <MenuItem value="inactive">inactive</MenuItem>
                  </TextField>
                  <Button variant="contained" onClick={handleUpdate} disabled={busy.update} sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}>
                    {busy.update ? "Updating..." : "Update Section"}
                  </Button>
                </Stack>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
                <Typography sx={{ fontWeight: 700, color: "#1f2a24", mb: 1.5 }}>Section metadata</Typography>
                <Stack spacing={0.8}>
                  <Typography variant="body2" sx={{ color: "#1f2a24" }}>
                    ID: {section?._id || section?.id || "-"}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#1f2a24" }}>
                    Type: {sectionType}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#1f2a24" }}>
                    Products: {productIds.length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#1f2a24" }}>
                    Categories: {categoryIds.length}
                  </Typography>
                </Stack>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
                <Typography sx={{ fontWeight: 700, color: "#1f2a24", mb: 1.5 }}>Products in section</Typography>
                <Stack spacing={1.25}>
                  <TextField
                    label="Add products by IDs (comma separated)"
                    size="small"
                    value={productIdsInput}
                    onChange={(event) => setProductIdsInput(event.target.value)}
                    helperText="Example: 664f...a1, 664f...b2"
                  />
                  <Button variant="outlined" onClick={handleAddProducts} disabled={busy.addProducts} sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }}>
                    {busy.addProducts ? "Adding..." : "Add Products"}
                  </Button>
                  <TextField label="Remove one product ID" size="small" value={singleProductId} onChange={(event) => setSingleProductId(event.target.value)} />
                  <Button variant="outlined" color="error" onClick={handleRemoveProduct} disabled={busy.removeProduct} sx={{ textTransform: "none", fontWeight: 700 }}>
                    {busy.removeProduct ? "Removing..." : "Remove Product"}
                  </Button>
                  <Box component="pre" sx={{ m: 0, p: 1.2, borderRadius: 1.2, bgcolor: alpha("#0f3828", 0.04), fontSize: 12, maxHeight: 160, overflow: "auto" }}>
                    {JSON.stringify(productIds, null, 2)}
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
                <Typography sx={{ fontWeight: 700, color: "#1f2a24", mb: 1.5 }}>Categories in section</Typography>
                <Stack spacing={1.25}>
                  <TextField
                    label="Add categories by IDs (comma separated)"
                    size="small"
                    value={categoryIdsInput}
                    onChange={(event) => setCategoryIdsInput(event.target.value)}
                    helperText="Use with category_grid sections"
                  />
                  <Button variant="outlined" onClick={handleAddCategories} disabled={busy.addCategories} sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }}>
                    {busy.addCategories ? "Adding..." : "Add Categories"}
                  </Button>
                  <TextField label="Remove one category ID" size="small" value={singleCategoryId} onChange={(event) => setSingleCategoryId(event.target.value)} />
                  <Button variant="outlined" color="error" onClick={handleRemoveCategory} disabled={busy.removeCategory} sx={{ textTransform: "none", fontWeight: 700 }}>
                    {busy.removeCategory ? "Removing..." : "Remove Category"}
                  </Button>
                  <Box component="pre" sx={{ m: 0, p: 1.2, borderRadius: 1.2, bgcolor: alpha("#0f3828", 0.04), fontSize: 12, maxHeight: 160, overflow: "auto" }}>
                    {JSON.stringify(categoryIds, null, 2)}
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default AdminSectionDetail;
