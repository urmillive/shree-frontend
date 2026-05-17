import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Divider,
  Grid,
  Link,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import AdminNavbar from "../components/AdminNavbar";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  deleteAdminCategory,
  fetchAdminCategories,
  fetchAdminCategoryById,
  flattenCategories,
  getCategoryParentId,
  normalizeCategoryAncestors,
  normalizeCategoryPayload,
  uploadAdminCategoryImageFromFile,
} from "../services/adminCategoriesService";

const pageBg = "#ffffff";
const accent = "#ab8a48";
const forest = "#0f3828";

const getCategoryId = (category) => String(category?._id || category?.id || category?._uiId || "").trim();

const DETAIL_SKIP_KEYS = new Set(["image", "imageUrl", "imageKey", "children", "__v", "ancestors", "parent", "seo"]);

const FIELD_LABEL_OVERRIDES = {
  metaTitle: "SEO Meta Title",
  metaDescription: "SEO Meta Description",
};

function formatFieldLabel(key) {
  if (FIELD_LABEL_OVERRIDES[key]) return FIELD_LABEL_OVERRIDES[key];
  return key.replace(/([A-Z])/g, " $1").trim();
}

function formatFieldValue(v) {
  if (v != null && typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v ?? "—");
}

const AdminCategoryDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { categoryId = "" } = useParams();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  const imageInputRef = useRef(null);
  const [category, setCategory] = useState(null);
  const [categoriesFlat, setCategoriesFlat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [activeTab, setActiveTab] = useState(0);
  const [pickedFile, setPickedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isAdminAllowed) return;
    if (!categoryId.trim()) {
      setLoading(false);
      setError("Missing category id.");
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      setCategory(null);
      setCategoriesFlat([]);
      setFeedback({ type: "", message: "" });
      try {
        const [{ data: categoryData }, { data: listData }] = await Promise.all([
          fetchAdminCategoryById(categoryId.trim()),
          fetchAdminCategories(),
        ]);
        if (cancelled) return;
        const fetched = normalizeCategoryPayload(categoryData);
        setCategory(fetched && typeof fetched === "object" ? fetched : null);
        setCategoriesFlat(flattenCategories(listData));
        if (!fetched || typeof fetched !== "object") {
          setError("Unexpected response from server.");
        }
      } catch (e) {
        if (cancelled) return;
        setCategory(null);
        setError(getApiErrorMessage(e, "Failed to load category."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isAdminAllowed, categoryId]);

  useEffect(() => {
    setActiveTab(0);
    setPickedFile(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }, [categoryId]);

  useEffect(() => {
    const notice = location.state?.imageUploadNotice;
    if (!notice || !categoryId.trim()) return;
    setFeedback({ type: "error", message: String(notice) });
    navigate(`/admin/categories/${encodeURIComponent(categoryId.trim())}`, { replace: true, state: {} });
  }, [categoryId, location.state, navigate]);

  const ancestors = useMemo(() => normalizeCategoryAncestors(category), [category]);

  const parentId = useMemo(() => getCategoryParentId(category), [category]);

  const parentLabel = useMemo(() => {
    if (!parentId) return null;
    const fromAncestors = ancestors.find((item) => item.id === parentId);
    if (fromAncestors?.name) return fromAncestors.name;
    const fromList = categoriesFlat.find((item) => getCategoryId(item) === parentId);
    return fromList?.name || parentId;
  }, [ancestors, categoriesFlat, parentId]);


  const { leftEntries, rightEntries } = useMemo(() => {
    const entries = Object.entries(category || {}).filter(([k]) => !DETAIL_SKIP_KEYS.has(k));
    entries.push(
      ["metaTitle", category?.seo?.metaTitle?.trim() || null],
      ["metaDescription", category?.seo?.metaDescription?.trim() || null],
    );
    const mid = Math.ceil(entries.length / 2);
    return {
      leftEntries: entries.slice(0, mid),
      rightEntries: entries.slice(mid),
    };
  }, [category]);

  const onPickImage = (event) => {
    const file = Array.from(event.target.files || []).find((f) => f && String(f.type || "").startsWith("image/"));
    if (!file) return;
    setPickedFile(file);
    setFeedback({ type: "", message: "" });
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const clearPickedFile = () => {
    setPickedFile(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleUploadAndConfirm = async () => {
    if (!pickedFile) {
      setFeedback({ type: "error", message: "Choose an image file first." });
      return;
    }
    setUploading(true);
    setFeedback({ type: "", message: "" });
    try {
      const updated = await uploadAdminCategoryImageFromFile(categoryId.trim(), pickedFile);
      if (updated) {
        setCategory(updated);
      } else {
        const { data: categoryData } = await fetchAdminCategoryById(categoryId.trim());
        setCategory(normalizeCategoryPayload(categoryData));
      }
      clearPickedFile();
      setFeedback({ type: "success", message: "Image uploaded and confirmed." });
      setActiveTab(1);
    } catch (e) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(e, "Image upload or confirm failed."),
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Soft-delete this category? It must not have active children.")) return;
    setDeleting(true);
    setFeedback({ type: "", message: "" });
    try {
      await deleteAdminCategory(categoryId.trim());
      navigate("/admin/categories");
    } catch (e) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(e, "Failed to delete category."),
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

  const displayName = String(category?.name || "Category");
  const imageUrl = String(category?.imageUrl || category?.image?.url || "").trim();
  const imageKey = String(category?.imageKey || category?.image?.key || "").trim();
  const hasImage = Boolean(imageUrl);
  const levelLabel = Number.isFinite(Number(category?.level)) ? Number(category.level) + 1 : "—";

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
            { label: "Categories", to: "/admin/categories" },
            { label: loading ? "Category" : displayName },
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
        ) : category ? (
          <Paper elevation={0} sx={cardSx}>
            <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
              Category
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#19271f", wordBreak: "break-word" }}>
              {displayName}
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }}>
              <Typography sx={{ color: "#6f7f77", fontWeight: 600, fontSize: 13 }}>
                Status: {category?.isActive ? "Active" : "Inactive"} | Level: {levelLabel}
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate(`/admin/categories/${encodeURIComponent(categoryId.trim())}/edit`)}
                sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}
              >
                Edit Category
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
              <Tab label={hasImage ? "Image" : "Image (none)"} />
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
                          {formatFieldValue(v)}
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
                          {formatFieldValue(v)}
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
                    Hierarchy
                  </Typography>
                  <Breadcrumbs
                    aria-label="Category hierarchy"
                    separator="›"
                    sx={{
                      flexWrap: "wrap",
                      "& .MuiBreadcrumbs-separator": { color: alpha(forest, 0.45), mx: 0.5 },
                    }}
                  >
                    <Link
                      component="button"
                      type="button"
                      underline="hover"
                      onClick={() => navigate("/admin/categories")}
                      sx={{ color: accent, fontWeight: 700, fontSize: 14, border: 0, bgcolor: "transparent", cursor: "pointer", p: 0 }}
                    >
                      Categories
                    </Link>
                    {ancestors.map((ancestor, index) => (
                      <Link
                        key={ancestor.id || `ancestor-${index}`}
                        component="button"
                        type="button"
                        underline="hover"
                        onClick={() => ancestor.id && navigate(`/admin/categories/${encodeURIComponent(ancestor.id)}`)}
                        disabled={!ancestor.id}
                        sx={{
                          color: accent,
                          fontWeight: 700,
                          fontSize: 14,
                          border: 0,
                          bgcolor: "transparent",
                          cursor: ancestor.id ? "pointer" : "default",
                          p: 0,
                          textAlign: "left",
                        }}
                      >
                        {ancestor.name}
                      </Link>
                    ))}
                    <Typography sx={{ fontWeight: 800, fontSize: 14, color: "#19271f" }}>{displayName}</Typography>
                  </Breadcrumbs>
                  <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1.25 }}>
                    <Typography variant="body2" sx={{ color: "#6f7f77", fontWeight: 600 }}>
                      Parent:
                    </Typography>
                    {parentId ? (
                      <Link
                        component="button"
                        type="button"
                        underline="hover"
                        onClick={() => navigate(`/admin/categories/${encodeURIComponent(parentId)}`)}
                        sx={{
                          color: accent,
                          fontWeight: 700,
                          fontSize: 14,
                          border: 0,
                          bgcolor: "transparent",
                          cursor: "pointer",
                          p: 0,
                        }}
                      >
                        {parentLabel}
                      </Link>
                    ) : (
                      <Typography variant="body2" sx={{ color: "#1f2a24", fontWeight: 600 }}>
                        None (root category)
                      </Typography>
                    )}
                  </Stack>
                  {ancestors.length > 0 ? (
                    <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                      <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>
                        Ancestors ({ancestors.length})
                      </Typography>
                      {ancestors.map((ancestor, index) => (
                        <Stack
                          key={ancestor.id || `ancestor-row-${index}`}
                          direction="row"
                          spacing={1}
                          alignItems="baseline"
                          flexWrap="wrap"
                          useFlexGap
                        >
                          <Typography variant="body2" sx={{ color: "#8a9690", fontWeight: 700, minWidth: 20 }}>
                            {index + 1}.
                          </Typography>
                          {ancestor.id ? (
                            <Link
                              component="button"
                              type="button"
                              underline="hover"
                              onClick={() => navigate(`/admin/categories/${encodeURIComponent(ancestor.id)}`)}
                              sx={{
                                color: accent,
                                fontWeight: 700,
                                fontSize: 14,
                                border: 0,
                                bgcolor: "transparent",
                                cursor: "pointer",
                                p: 0,
                                textAlign: "left",
                              }}
                            >
                              {ancestor.name}
                            </Link>
                          ) : (
                            <Typography variant="body2" sx={{ color: "#1f2a24", fontWeight: 600 }}>
                              {ancestor.name}
                            </Typography>
                          )}
                          {ancestor.slug ? (
                            <Typography variant="caption" sx={{ color: "#8a9690" }}>
                              /{ancestor.slug}
                            </Typography>
                          ) : null}
                        </Stack>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" sx={{ color: "#6f7f77", mt: 1.25 }}>
                      No ancestors — this is a top-level category.
                    </Typography>
                  )}
                </Box>
              </>
            ) : (
              <Box>
                {hasImage ? (
                  <Stack spacing={2}>
                    <Typography variant="body2" sx={{ color: "#6f7f77", fontWeight: 600 }}>
                      Storage key: {imageKey || "—"}
                    </Typography>
                    <Link
                      href={imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="body2"
                      sx={{ color: accent, fontWeight: 600, wordBreak: "break-all" }}
                    >
                      {imageUrl}
                    </Link>
                    <Box
                      component="a"
                      href={imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ display: "inline-block", maxWidth: "100%", cursor: "pointer" }}
                    >
                      <Box
                        component="img"
                        src={imageUrl}
                        alt={displayName}
                        sx={{
                          maxWidth: "100%",
                          maxHeight: 320,
                          objectFit: "contain",
                          borderRadius: 2,
                          border: `1px solid ${alpha(forest, 0.12)}`,
                          display: "block",
                          boxShadow: "0 6px 16px rgba(20, 55, 42, 0.08)",
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ color: "#6f7f77" }}>
                      Click the URL or image to open in a new tab. To replace the image, use Edit Category.
                    </Typography>
                  </Stack>
                ) : (
                  <Box
                    sx={{
                      py: 4,
                      px: 2,
                      borderRadius: 2,
                      bgcolor: alpha(forest, 0.03),
                      border: `1px dashed ${alpha(forest, 0.15)}`,
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, color: "#19271f", mb: 0.5 }}>No image yet</Typography>
                    <Typography variant="body2" sx={{ color: "#6f7f77", mb: 2 }}>
                      Pick a file and upload — the app requests a presigned URL, uploads your file, then confirms with the
                      server.
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} alignItems={{ sm: "center" }} flexWrap="wrap" useFlexGap>
                      <Button
                        variant="outlined"
                        component="label"
                        sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }}
                      >
                        Choose image
                        <input ref={imageInputRef} hidden type="file" accept="image/*" onChange={onPickImage} />
                      </Button>
                      <Button
                        variant="contained"
                        onClick={handleUploadAndConfirm}
                        disabled={uploading || !pickedFile}
                        sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}
                      >
                        {uploading ? "Uploading…" : "Upload and confirm"}
                      </Button>
                      {pickedFile ? (
                        <Button variant="text" onClick={clearPickedFile} sx={{ textTransform: "none", fontWeight: 700 }}>
                          Clear selection
                        </Button>
                      ) : null}
                    </Stack>
                    {pickedFile ? (
                      <Typography variant="caption" sx={{ color: "#6f7f77", wordBreak: "break-all", display: "block", mt: 1.5 }}>
                        Selected: {pickedFile.name}
                      </Typography>
                    ) : null}
                  </Box>
                )}
              </Box>
            )}

            <Divider sx={{ mt: 3, mb: 2 }} />

            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={1}>
              <Typography variant="caption" sx={{ color: "#8a9690", fontWeight: 600 }}>
                ID: {getCategoryId(category) || "—"}
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

export default AdminCategoryDetail;
