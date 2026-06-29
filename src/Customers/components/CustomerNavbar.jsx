import React, { useCallback, useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  alpha,
  AppBar,
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { FiHeart, FiMenu, FiShoppingBag, FiUser, FiX } from "react-icons/fi";
import { MdExpandMore } from "react-icons/md";
import logoMark from "../../assets/logo-mark.svg";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import client, {
  clearStoredAccessToken,
  getStoredAccessToken,
  getStoredRole,
  getStoredUserDisplayName,
} from "../../Setup/Axios";
import {
  fetchPublicCategoryTree,
  getPublicCategoryName,
  getPublicCategorySlug,
  normalizePublicCategoryTreePayload,
} from "../services/publicCategoriesService";
import { colors, fonts, inkAlpha } from "../../theme/theme";
import { useCart } from "../context/useCart";
import { useWishlist } from "../context/useWishlist";

const drawerWidth = 320;

const announcementMessages = [
  "Complimentary shipping on orders above ₹2,499",
  "New arrivals · curated weekly",
  "Returns within 7 days · hassle-free",
];

const wordmarkSx = {
  fontFamily: fonts.display,
  fontWeight: 500,
  letterSpacing: { xs: "0.32em", sm: "0.38em" },
  fontSize: { xs: 16, sm: 20 },
  lineHeight: 1,
  color: colors.ink,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

const navLinkSx = {
  fontFamily: fonts.body,
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: colors.ink,
  px: 1.5,
  py: 1,
  minWidth: 0,
  borderRadius: 0,
  position: "relative",
  "&::after": {
    content: '""',
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 6,
    height: "1px",
    background: colors.ink,
    transform: "scaleX(0)",
    transformOrigin: "left",
    transition: "transform 200ms cubic-bezier(0.2,0.7,0.2,1)",
  },
  "&:hover": {
    backgroundColor: "transparent",
    color: colors.wine,
    "&::after": { transform: "scaleX(1)", background: colors.wine },
  },
};

const getNodeChildren = (node) =>
  Array.isArray(node?.children) ? node.children : [];

function MobileCategoryTree({ nodes = [], level = 0, onNodeClick }) {
  if (!Array.isArray(nodes) || nodes.length === 0) return null;

  return (
    <Stack spacing={0}>
      {nodes.map((node, idx) => {
        const slug = getPublicCategorySlug(node);
        const name = getPublicCategoryName(node);
        const children = getNodeChildren(node);
        const key = slug || `${name}-${level}-${idx}`;
        const hasChildren = children.length > 0;

        if (!hasChildren) {
          return (
            <Button
              key={key}
              component={slug ? RouterLink : "button"}
              to={slug ? `/categories/${encodeURIComponent(slug)}` : undefined}
              onClick={onNodeClick}
              sx={{
                justifyContent: "flex-start",
                textTransform: "none",
                fontWeight: 400,
                fontSize: 14,
                color: colors.ink,
                pl: 1 + level * 1.5,
                py: 0.85,
                minHeight: 0,
                borderRadius: 0,
                "&:hover": { color: colors.wine, backgroundColor: "transparent" },
              }}
            >
              {name}
            </Button>
          );
        }

        return (
          <Accordion
            key={key}
            disableGutters
            elevation={0}
            sx={{
              bgcolor: "transparent",
              boxShadow: "none",
              "&::before": { display: "none" },
            }}
          >
            <AccordionSummary
              expandIcon={<MdExpandMore size={18} color={colors.muted} />}
              sx={{
                px: 0.25,
                pl: 1 + level * 1.5,
                py: 0,
                minHeight: 40,
                "& .MuiAccordionSummary-content": { my: 0.5 },
              }}
            >
              {slug ? (
                <Typography
                  component={RouterLink}
                  to={`/categories/${encodeURIComponent(slug)}`}
                  onClick={onNodeClick}
                  sx={{
                    textDecoration: "none",
                    color: colors.ink,
                    fontWeight: 500,
                    fontSize: 14,
                    "&:hover": { color: colors.wine },
                  }}
                >
                  {name}
                </Typography>
              ) : (
                <Typography
                  sx={{ color: colors.ink, fontWeight: 500, fontSize: 14 }}
                >
                  {name}
                </Typography>
              )}
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, pb: 0.5, px: 0 }}>
              <MobileCategoryTree
                nodes={children}
                level={level + 1}
                onNodeClick={onNodeClick}
              />
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Stack>
  );
}

const AnnouncementBar = () => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setIdx((i) => (i + 1) % announcementMessages.length),
      4500
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <Box
      sx={{
        bgcolor: colors.ink,
        color: colors.ivory,
        textAlign: "center",
        py: 1,
        px: 2,
        fontFamily: fonts.body,
        fontSize: 11,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        fontWeight: 400,
        minHeight: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        key={idx}
        sx={{
          opacity: 0,
          animation: "sg-fade 4.5s ease-in-out infinite",
          "@keyframes sg-fade": {
            "0%": { opacity: 0, transform: "translateY(2px)" },
            "12%, 88%": { opacity: 1, transform: "translateY(0)" },
            "100%": { opacity: 0, transform: "translateY(-2px)" },
          },
        }}
      >
        {announcementMessages[idx]}
      </Box>
    </Box>
  );
};

const CustomerNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(() =>
    Boolean(getStoredAccessToken())
  );
  const [loggingOut, setLoggingOut] = useState(false);
  const [categoryTree, setCategoryTree] = useState([]);
  const { cart } = useCart();
  const { wishlist } = useWishlist();

  const syncAuth = useCallback(() => {
    setLoggedIn(Boolean(getStoredAccessToken()));
  }, []);

  useEffect(() => {
    syncAuth();
  }, [location.pathname, syncAuth]);

  useEffect(() => {
    let cancelled = false;
    fetchPublicCategoryTree()
      .then((res) => {
        if (cancelled) return;
        setCategoryTree(normalizePublicCategoryTreePayload(res?.data));
      })
      .catch(() => {
        if (!cancelled) setCategoryTree([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDrawerToggle = () => setMobileOpen((open) => !open);
  const closeDrawer = () => setMobileOpen(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    closeDrawer();
    try {
      await client.post("/auth/logout", {});
    } catch {
      /* still clear locally */
    } finally {
      clearStoredAccessToken();
      setLoggingOut(false);
      setLoggedIn(false);
      navigate("/login", { replace: true });
    }
  };

  const role = getStoredRole();
  const displayName = getStoredUserDisplayName();
  const showAdminEntry = role === "super_admin" || role === "manager";

  const desktopNav = (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0}
      sx={{
        display: { xs: "none", md: "flex" },
        position: { md: "absolute" },
        left: { md: "50%" },
        transform: { md: "translateX(-50%)" },
      }}
    >
      <Button component={RouterLink} to="/" sx={navLinkSx}>
        Home
      </Button>
      <Button component={RouterLink} to="/products" sx={navLinkSx}>
        Shop
      </Button>
      <Button component={RouterLink} to="/categories" sx={navLinkSx}>
        Categories
      </Button>
      {showAdminEntry ? (
        <Button
          component={RouterLink}
          to="/admin/dashboard"
          sx={{ ...navLinkSx, color: colors.wine }}
        >
          Admin
        </Button>
      ) : null}
    </Stack>
  );

  const desktopActions = (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.5}
      sx={{
        display: { xs: "none", md: "flex" },
        ml: "auto",
        flexShrink: 0,
      }}
    >
      {loggedIn ? (
        <IconButton
          component={RouterLink}
          to="/wishlist"
          aria-label="Wishlist"
          size="small"
          sx={{ color: colors.ink, "&:hover": { color: colors.wine } }}
        >
          <Badge color="secondary" badgeContent={wishlist?.total || 0} max={99}>
            <FiHeart size={20} />
          </Badge>
        </IconButton>
      ) : null}
      {loggedIn ? (
        <IconButton
          component={RouterLink}
          to="/profile"
          aria-label="Account"
          size="small"
          sx={{ color: colors.ink, "&:hover": { color: colors.wine } }}
        >
          <FiUser size={20} />
        </IconButton>
      ) : (
        <Button
          component={RouterLink}
          to="/login"
          sx={{ ...navLinkSx, px: 1.25 }}
        >
          Sign in
        </Button>
      )}
      <IconButton
        component={RouterLink}
        to="/cart"
        aria-label="Cart"
        size="small"
        sx={{ color: colors.ink, "&:hover": { color: colors.wine } }}
      >
        <Badge color="secondary" badgeContent={cart?.itemCount || 0} max={99}>
          <FiShoppingBag size={20} />
        </Badge>
      </IconButton>
      {loggedIn ? (
        <Button
          variant="text"
          onClick={handleLogout}
          disabled={loggingOut}
          sx={{ ...navLinkSx, ml: 0.5, color: colors.muted }}
        >
          {loggingOut ? "Signing out…" : "Sign out"}
        </Button>
      ) : null}
    </Stack>
  );

  const drawer = (
    <Box sx={{ pt: 2, pb: 3, bgcolor: colors.paper, height: "100%" }} role="presentation">
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2.5, pb: 2 }}
      >
        <Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
          <Box
            component="img"
            src={logoMark}
            alt=""
            aria-hidden="true"
            sx={{ height: 24, width: "auto", display: "block", mr: 1 }}
          />
          <Typography sx={{ ...wordmarkSx, fontSize: 14 }}>
            Shree Gallary
          </Typography>
        </Box>
        <IconButton onClick={closeDrawer} aria-label="Close menu" size="small">
          <FiX size={20} />
        </IconButton>
      </Stack>
      <Divider sx={{ borderColor: colors.line }} />

      <List
        sx={{
          px: 1.5,
          pt: 1.5,
          "& .MuiListItemButton-root": {
            py: 1.1,
            borderRadius: 0,
            "&:hover": { backgroundColor: "transparent" },
            "& .MuiListItemText-primary": {
              fontFamily: fonts.body,
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: colors.ink,
            },
          },
        }}
      >
        <ListItemButton component={RouterLink} to="/" onClick={closeDrawer}>
          <ListItemText primary="Home" />
        </ListItemButton>
        <ListItemButton component={RouterLink} to="/products" onClick={closeDrawer}>
          <ListItemText primary="Shop" />
        </ListItemButton>
        <ListItemButton component={RouterLink} to="/categories" onClick={closeDrawer}>
          <ListItemText primary="Categories" />
        </ListItemButton>
        <ListItemButton component={RouterLink} to="/cart" onClick={closeDrawer}>
          <ListItemText primary={`Cart (${cart?.itemCount || 0})`} />
        </ListItemButton>
        {loggedIn ? (
          <ListItemButton component={RouterLink} to="/wishlist" onClick={closeDrawer}>
            <ListItemText primary={`Wishlist (${wishlist?.total || 0})`} />
          </ListItemButton>
        ) : null}
        {loggedIn ? (
          <ListItemButton component={RouterLink} to="/orders" onClick={closeDrawer}>
            <ListItemText primary="Orders" />
          </ListItemButton>
        ) : null}
        {loggedIn ? (
          <ListItemButton component={RouterLink} to="/profile" onClick={closeDrawer}>
            <ListItemText primary="Profile" />
          </ListItemButton>
        ) : null}
        {showAdminEntry ? (
          <ListItemButton component={RouterLink} to="/admin/dashboard" onClick={closeDrawer}>
            <ListItemText primary="Admin" />
          </ListItemButton>
        ) : null}
        {!loggedIn ? (
          <>
            <ListItemButton component={RouterLink} to="/login" onClick={closeDrawer}>
              <ListItemText primary="Sign in" />
            </ListItemButton>
            <ListItemButton component={RouterLink} to="/signup" onClick={closeDrawer}>
              <ListItemText primary="Create account" />
            </ListItemButton>
          </>
        ) : (
          <ListItemButton disabled={loggingOut} onClick={() => void handleLogout()}>
            <ListItemText primary={loggingOut ? "Signing out…" : "Sign out"} />
          </ListItemButton>
        )}
      </List>

      <Divider sx={{ my: 2, mx: 2.5, borderColor: colors.line }} />

      <Box sx={{ px: 2.5 }}>
        <Typography
          sx={{
            fontFamily: fonts.body,
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontWeight: 500,
            color: colors.muted,
            mb: 1.25,
          }}
        >
          Categories
        </Typography>
        {categoryTree.length > 0 ? (
          <MobileCategoryTree nodes={categoryTree} onNodeClick={closeDrawer} />
        ) : (
          <Typography
            sx={{ fontSize: 13, color: colors.muted, py: 0.6 }}
          >
            Categories will appear here soon.
          </Typography>
        )}
        <Accordion
          disableGutters
          elevation={0}
          defaultExpanded
          sx={{
            bgcolor: "transparent",
            boxShadow: "none",
            "&::before": { display: "none" },
          }}
        >
          <AccordionSummary
            expandIcon={<MdExpandMore size={20} />}
            sx={{
              px: 0.25,
              minHeight: 44,
              "& .MuiAccordionSummary-content": { my: 0.5 },
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: alpha(colors.text, 0.85) }}>
              Categories
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, pb: 0.5, px: 0 }}>
            {categoryTree.length > 0 ? (
              <MobileCategoryTree nodes={categoryTree} onNodeClick={closeDrawer} />
            ) : (
              <Typography sx={{ fontSize: 13, color: alpha(colors.text, 0.55), py: 0.6 }}>
                Categories will appear here soon.
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>
      </Box>

      {loggedIn && displayName ? (
        <>
          <Divider sx={{ my: 2, mx: 2.5, borderColor: colors.line }} />
          <Typography sx={{ px: 2.5, fontSize: 13, color: colors.muted }}>
            Signed in as <strong style={{ color: colors.ink }}>{displayName}</strong>
          </Typography>
        </>
      ) : null}
    </Box>
  );

  return (
    <>
      <AnnouncementBar />
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: colors.ivory,
          backdropFilter: "saturate(180%) blur(8px)",
          backgroundColor: inkAlpha(0.0),
          background: `${colors.ivory}`,
          borderBottom: `1px solid ${colors.line}`,
          color: colors.ink,
          top: 0,
        }}
      >
        <Toolbar
          sx={{
            maxWidth: 1440,
            width: "100%",
            mx: "auto",
            px: { xs: 2, sm: 3 },
            minHeight: { xs: 56, sm: 72 },
            gap: 1,
            position: "relative",
          }}
        >
          <IconButton
            color="inherit"
            aria-label="Open navigation menu"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{
              display: { md: "none" },
              mr: 0.5,
              color: colors.ink,
            }}
          >
            <FiMenu size={22} />
          </IconButton>

          <Box
            component={RouterLink}
            to="/"
            sx={{
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
              color: "inherit",
              minWidth: 0,
              mr: { md: 0 },
            }}
          >
            <Box
              component="img"
              src={logoMark}
              alt=""
              aria-hidden="true"
              sx={{ height: { xs: 28, sm: 32 }, width: "auto", display: "block", mr: { xs: 1, sm: 1.25 } }}
            />
            <Typography component="span" sx={wordmarkSx}>
              Shree Gallary
            </Typography>
          </Box>

          {desktopNav}

          <Stack
            direction="row"
            alignItems="center"
            spacing={0}
            sx={{ display: { xs: "flex", md: "none" }, ml: "auto" }}
          >
            <IconButton
              component={RouterLink}
              to="/cart"
              aria-label="Cart"
              size="small"
              sx={{ color: colors.ink }}
            >
              <Badge
                color="secondary"
                badgeContent={cart?.itemCount || 0}
                max={99}
              >
                <FiShoppingBag size={20} />
              </Badge>
            </IconButton>
            {loggedIn ? (
              <IconButton
                component={RouterLink}
                to="/profile"
                aria-label="Account"
                size="small"
                sx={{ color: colors.ink }}
              >
                <FiUser size={20} />
              </IconButton>
            ) : (
              <IconButton
                component={RouterLink}
                to="/login"
                aria-label="Sign in"
                size="small"
                sx={{ color: colors.ink }}
              >
                <FiUser size={20} />
              </IconButton>
            )}
          </Stack>

          {desktopActions}
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
            bgcolor: colors.paper,
            borderRight: `1px solid ${colors.line}`,
          },
        }}
      >
        {drawer}
      </Drawer>

    </>
  );
};

export default CustomerNavbar;
