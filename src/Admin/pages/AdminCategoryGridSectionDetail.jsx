import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  Link,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import { getApiErrorMessage } from "../../utils/apiError";
import AdminNavbar from "../components/AdminNavbar";
import { normalizeCategoryPayload } from "../services/adminCategoriesService";

const pageBg = "#ffffff";
const accent = "#ab8a48";
const forest = "#0f3828";

const DETAIL_SKIP_KEYS = new Set(["productIds", "categoryIds", "__v"]);

const FIELD_LABEL_OVERRIDES = {
  _id: "ID",
  displayOrder: "Display Order",
  isActive: "Is Active",
  createdAt: "Created",
  updatedAt: "Updated",
};

function pickSectionId(section) {
  if (!section) return "";
  return String(section._id ?? section.id ?? "").trim();
}

function normalizeSectionPayload(payload) {
  if (payload == null) return null;
  const root = payload?.data !== undefined ? payload.data : payload;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root.section ?? root;
  }
  return root;
}

function formatFieldLabel(key) {
  if (FIELD_LABEL_OVERRIDES[key]) return FIELD_LABEL_OVERRIDES[key];
  return key.replace(/([A-Z])/g, " $1").trim();
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function formatFieldValue(key, v) {
  if (key === "createdAt" || key === "updatedAt") return formatDateTime(v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (v != null && typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v ?? "—");
}

function getCategoryId(category) {
  return String(category?._id ?? category?.id ?? category?._uiId ?? "").trim();
}

function getCategoryDisplayName(category) {
  const path = String(category?._uiPathLabel || "").trim();
  const name = String(category?.name || category?.title || "").trim();
  const slug = String(category?.slug || "").trim();
  if (path) return path;
  if (name && slug) return `${name} (${slug})`;
  if (name) return name;
  if (slug) return slug;
  return getCategoryId(category) || "—";
}

const AdminCategoryGridSectionDetail = () => {
  const navigate = useNavigate();
  const { sectionId = "" } = useParams();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  const [section, setSection] = useState(null);
  const [linkedCategories, setLinkedCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [activeTab, setActiveTab] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isAdminAllowed) return;
    if (!sectionId.trim()) {
      setLoading(false);
      setError("Missing section id.");
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      setFeedback({ type: "", message: "" });
      setSection(null);
      setLinkedCategories([]);
      try {
        const { data } = await client.get(`/admin/sections/${encodeURIComponent(sectionId.trim())}`);
        if (cancelled) return;
        const fetched = normalizeSectionPayload(data);
        if (!fetched || typeof fetched !== "object") {
          setSection(null);
          setError("Unexpected response from server.");
          return;
        }
        if (fetched.type !== "category_grid") {
          setSection(null);
          setError("This section is not a category_grid section.");
          return;
        }
        setSection(fetched);
      } catch (e) {
        if (cancelled) return;
        setSection(null);
        setError(getApiErrorMessage(e, "Failed to load section."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isAdminAllowed, sectionId]);

  useEffect(() => {
    setActiveTab(0);
  }, [sectionId]);

  const categoryIds = useMemo(
    () => (Array.isArray(section?.categoryIds) ? section.categoryIds.map((id) => String(id).trim()).filter(Boolean) : []),
    [section],
  );

  useEffect(() => {
    if (!categoryIds.length) {
      setLinkedCategories([]);
      return;
    }

    let cancelled = false;

    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const results = await Promise.all(
          categoryIds.map(async (id) => {
            try {
              const { data } = await client.get(`/admin/categories/${encodeURIComponent(id)}`);
              return normalizeCategoryPayload(data);
            } catch {
              return { _id: id, id };
            }
          }),
        );
        if (!cancelled) {
          setLinkedCategories(results.filter((item) => item && typeof item === "object"));
        }
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    };

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, [categoryIds]);

  const handleDelete = async () => {
    if (!window.confirm("Soft-delete this section?")) return;
    setDeleting(true);
    setFeedback({ type: "", message: "" });
    try {
      await client.delete(`/admin/sections/${encodeURIComponent(sectionId.trim())}`);
      navigate("/admin/homepage-cms/category-grid-sections");
    } catch (e) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(e, "Failed to delete section."),
      });
    } finally {
      setDeleting(false);
    }
  };

  const { leftEntries, rightEntries } = useMemo(() => {
    const entries = Object.entries(section || {}).filter(([k]) => !DETAIL_SKIP_KEYS.has(k));
    const mid = Math.ceil(entries.length / 2);
    return {
      leftEntries: entries.slice(0, mid),
      rightEntries: entries.slice(mid),
    };
  }, [section]);

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

  const id = pickSectionId(section);
  const displayTitle = String(section?.title || "Category Grid Section");
  const statusLabel = section?.isActive ? "Active" : "Inactive";
  const typeLabel = section?.type ? String(section.type) : "—";
  const categoryCount = categoryIds.length;

  const cardSx = {
    p: { xs: 2, sm: 3 },
    borderRadius: 2,
    border: `1px solid ${alpha(forest, 0.1)}`,
    boxShadow: "0 8px 20px rgba(20, 55, 42, 0.06)",
  };

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />

      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Homepage CMS", to: "/admin/homepage-cms" },
            { label: "Category Grid Sections", to: "/admin/homepage-cms/category-grid-sections" },
            { label: loading ? "Section" : displayTitle },
          ]}
        />

        {feedback.message ? (
          <Alert severity={feedback.type === "success" ? "success" : "error"} sx={{ mb: 2 }}>
            {feedback.message}
          </Alert>
        ) : null}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={32} sx={{ color: accent }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : section ? (
          <Paper elevation={0} sx={cardSx}>
            <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
              Category Grid Section
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#19271f", wordBreak: "break-word" }}>
              {displayTitle}
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
              spacing={1.5}
              sx={{ mt: 0.5 }}
            >
              <Typography sx={{ color: "#6f7f77", fontWeight: 600, fontSize: 13 }}>
                Status: {statusLabel} | Type: {typeLabel} | Categories: {categoryCount}
              </Typography>
              <Button
                variant="contained"
                onClick={() =>
                  id && navigate(`/admin/homepage-cms/category-grid-sections/${encodeURIComponent(id)}/edit`)
                }
                disabled={!id}
                sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}
              >
                Edit Section
              </Button>
            </Stack>

            <Tabs
              value={activeTab}
              onChange={(_, next) => setActiveTab(next)}
              sx={{
                mt: 2,
                mb: 0,
                minHeight: 44,
                borderBottom: `1px solid ${alpha(forest, 0.1)}`,
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: 15,
                  minHeight: 44,
                  color: "#6f7f77",
                },
                "& .Mui-selected": { color: "#19271f" },
                "& .MuiTabs-indicator": { bgcolor: accent, height: 3, borderRadius: "3px 3px 0 0" },
              }}
            >
              <Tab label="Details" />
              <Tab label={categoryCount ? `Categories (${categoryCount})` : "Categories (none)"} />
            </Tabs>

            <Divider sx={{ mb: 2 }} />

            {activeTab === 0 ? (
              <>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={1.25}>
                      {leftEntries.map(([k, v]) => (
                        <Box key={k}>
                          <Typography
                            variant="caption"
                            sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}
                          >
                            {formatFieldLabel(k)}
                          </Typography>
                          <Typography variant="body1" sx={{ color: "#1f2a24", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                            {formatFieldValue(k, v)}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={1.25}>
                      {rightEntries.map(([k, v]) => (
                        <Box key={k}>
                          <Typography
                            variant="caption"
                            sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}
                          >
                            {formatFieldLabel(k)}
                          </Typography>
                          <Typography variant="body1" sx={{ color: "#1f2a24", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                            {formatFieldValue(k, v)}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Grid>
                </Grid>

                <Box
                  sx={{
                    mt: 2.5,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(forest, 0.03),
                    border: `1px solid ${alpha(forest, 0.1)}`,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6, display: "block", mb: 1 }}
                  >
                    Subtitle
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#1f2a24", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                    {section.subtitle?.trim() ? String(section.subtitle) : "—"}
                  </Typography>
                </Box>
              </>
            ) : (
              <Box sx={{ overflow: "auto" }}>
                {loadingCategories ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <CircularProgress size={28} sx={{ color: accent }} />
                  </Box>
                ) : categoryCount === 0 ? (
                  <Box
                    sx={{
                      py: 4,
                      px: 2,
                      borderRadius: 2,
                      bgcolor: alpha(forest, 0.03),
                      border: `1px dashed ${alpha(forest, 0.15)}`,
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, color: "#19271f", mb: 0.5 }}>No categories</Typography>
                    <Typography variant="body2" sx={{ color: "#6f7f77", mb: 2 }}>
                      Add categories to this section from Edit Section.
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() =>
                        id && navigate(`/admin/homepage-cms/category-grid-sections/${encodeURIComponent(id)}/edit`)
                      }
                      disabled={!id}
                      sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}
                    >
                      Edit Section
                    </Button>
                  </Box>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(accent, 0.08) }}>
                        <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Slug</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {categoryIds.map((cid, index) => {
                        const category = linkedCategories.find((item) => getCategoryId(item) === cid);
                        const categoryId = getCategoryId(category) || cid;
                        const hasDetails = Boolean(category?.name || category?.slug || category?.status);
                        return (
                          <TableRow key={cid}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell sx={{ maxWidth: 280, wordBreak: "break-word" }}>
                              {hasDetails ? getCategoryDisplayName(category) : cid}
                            </TableCell>
                            <TableCell>{category?.slug ? String(category.slug) : "—"}</TableCell>
                            <TableCell>{category?.status ? String(category.status) : "—"}</TableCell>
                            <TableCell align="right">
                              {categoryId ? (
                                <Link
                                  component="button"
                                  type="button"
                                  variant="body2"
                                  onClick={() => navigate(`/admin/categories/${encodeURIComponent(categoryId)}`)}
                                  sx={{ color: accent, fontWeight: 700, textTransform: "none" }}
                                >
                                  View category
                                </Link>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </Box>
            )}

            <Divider sx={{ mt: 3, mb: 2 }} />

            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={1}>
              <Typography variant="caption" sx={{ color: "#8a9690", fontWeight: 600 }}>
                ID: {id || "—"}
              </Typography>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDelete}
                disabled={deleting}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                {deleting ? "Deleting…" : "Soft Delete"}
              </Button>
            </Stack>
          </Paper>
        ) : null}
      </Box>
    </Box>
  );
};

export default AdminCategoryGridSectionDetail;
