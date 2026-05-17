import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
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

const AdminCategoryGridSectionDetail = () => {
  const navigate = useNavigate();
  const { sectionId = "" } = useParams();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [section, setSection] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const loadSection = async () => {
    if (!sectionId.trim()) return;
    setLoading(true);
    setFeedback({ type: "", message: "" });
    try {
      const { data } = await client.get(`/admin/sections/${encodeURIComponent(sectionId.trim())}`);
      const fetched = normalizeSection(data);
      setSection(fetched);
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

  const handleSoftDelete = async () => {
    if (!window.confirm("Delete this section?")) return;
    setDeleting(true);
    setFeedback({ type: "", message: "" });
    try {
      await client.delete(`/admin/sections/${encodeURIComponent(sectionId.trim())}`);
      navigate("/admin/homepage-cms/category-grid-sections");
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Failed to delete section."),
      });
    } finally {
      setDeleting(false);
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

  const categoryIds = Array.isArray(section?.categoryIds) ? section.categoryIds : [];
  const isCorrectType = section?.type === "category_grid";
  const sectionFields = [
    { label: "ID", value: section?._id || section?.id || "-" },
    { label: "Title", value: section?.title || "-" },
    { label: "Subtitle", value: section?.subtitle || "-" },
    { label: "Type", value: section?.type || "-" },
    { label: "Display Order", value: section?.displayOrder ?? 0 },
    { label: "Is Active", value: section?.isActive ? "Yes" : "No" },
    { label: "Categories", value: categoryIds.length },
    { label: "Created At", value: section?.createdAt ? new Date(section.createdAt).toLocaleString() : "-" },
    { label: "Updated At", value: section?.updatedAt ? new Date(section.updatedAt).toLocaleString() : "-" },
  ];
  const mid = Math.ceil(sectionFields.length / 2);
  const leftEntries = sectionFields.slice(0, mid);
  const rightEntries = sectionFields.slice(mid);

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1120, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Homepage CMS", to: "/admin/homepage-cms" },
            { label: "Category Grid Sections", to: "/admin/homepage-cms/category-grid-sections" },
            { label: "Section Detail" },
          ]}
        />
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>
            Category Grid Section Detail
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="text" sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }} onClick={() => navigate("/admin/homepage-cms/category-grid-sections")}>
              Back to list
            </Button>
            <Button variant="outlined" sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }} onClick={loadSection}>
              Refresh
            </Button>
            <Button variant="outlined" color="error" disabled={deleting} sx={{ textTransform: "none", fontWeight: 700 }} onClick={handleSoftDelete}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
            <Button variant="contained" sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }} onClick={() => navigate(`/admin/homepage-cms/category-grid-sections/${encodeURIComponent(sectionId)}/edit`)}>
              Edit Section
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
        ) : !isCorrectType ? (
          <Alert severity="error">This section is not a category_grid section.</Alert>
        ) : (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              border: `1px solid ${alpha("#0f3828", 0.1)}`,
              boxShadow: "0 8px 20px rgba(20, 55, 42, 0.06)",
            }}
          >
            <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
              Category Grid Section
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#19271f", mb: 2, wordBreak: "break-word" }}>
              {String(section?.title || "Section Detail")}
            </Typography>
            <Typography sx={{ color: "#6f7f77", fontWeight: 600, mb: 2 }}>
              Status: {section?.isActive ? "Active" : "Inactive"} | Type: {String(section?.type || "-")}
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
                mb: 2,
              }}
            >
              <Stack spacing={1.25}>
                {leftEntries.map((field) => (
                  <Box key={field.label}>
                    <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>
                      {field.label}
                    </Typography>
                    <Typography variant="body1" sx={{ color: "#1f2a24", wordBreak: "break-word" }}>
                      {String(field.value ?? "-")}
                    </Typography>
                  </Box>
                ))}
              </Stack>
              <Stack spacing={1.25}>
                {rightEntries.map((field) => (
                  <Box key={field.label}>
                    <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>
                      {field.label}
                    </Typography>
                    <Typography variant="body1" sx={{ color: "#1f2a24", wordBreak: "break-word" }}>
                      {String(field.value ?? "-")}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>

            <Typography sx={{ fontWeight: 700, color: "#1f2a24", mb: 1 }}>Category IDs</Typography>
            <Box component="pre" sx={{ m: 0, p: 1.25, borderRadius: 1.2, bgcolor: alpha("#0f3828", 0.04), fontSize: 12, maxHeight: 240, overflow: "auto" }}>
              {JSON.stringify(categoryIds, null, 2)}
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default AdminCategoryGridSectionDetail;
