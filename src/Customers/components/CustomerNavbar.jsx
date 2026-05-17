import React, { useCallback, useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
import { alpha } from "@mui/material/styles";
import {
  FiHeart,
  FiHome,
  FiLogIn,
  FiLogOut,
  FiMapPin,
  FiMenu,
  FiPackage,
  FiShield,
  FiShoppingBag,
  FiShoppingCart,
  FiUser,
  FiUserPlus,
  FiX,
} from "react-icons/fi";
import { MdExpandMore } from "react-icons/md";
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
import { colors } from "../../theme/theme";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";

const drawerWidth = 320;

const navIconSize = 18;
const navIconBtnSize = 20;

const linkButtonSx = {
  textTransform: "none",
  fontWeight: 600,
  fontSize: 14,
  color: colors.text,
  px: 1.25,
  py: 0.5,
  minWidth: 0,
  gap: 0.75,
  "&:hover": { bgcolor: alpha(colors.primary, 0.08), color: colors.primary },
};

const drawerListIconSx = {
  minWidth: 42,
  color: alpha(colors.text, 0.85),
};

const accountLinks = [
  { label: "My profile", to: "/profile", icon: FiUser },
  { label: "Addresses", to: "/profile/addresses", icon: FiMapPin },
  { label: "Orders", to: "/orders", icon: FiPackage },
];

const menuPaperSx = {
  mt: 1,
  minWidth: 196,
  borderRadius: 2,
  border: `1px solid ${alpha(colors.text, 0.08)}`,
  boxShadow: `0 12px 40px ${alpha(colors.text, 0.12)}`,
};

const menuItemSx = {
  gap: 1.25,
  py: 1,
  fontWeight: 600,
  fontSize: 14,
  color: colors.text,
};

const getNodeChildren = (node) => (Array.isArray(node?.children) ? node.children : []);

function MobileCategoryTree({ nodes = [], level = 0, onNodeClick }) {
  if (!Array.isArray(nodes) || nodes.length === 0) return null;

  return (
    <Stack spacing={0.5}>
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
                fontWeight: 500,
                color: colors.text,
                pl: 1 + level * 1.75,
                py: 0.6,
                minHeight: 0,
                borderRadius: 1.2,
                "&:hover": { bgcolor: alpha(colors.primary, 0.08) },
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
              expandIcon={<MdExpandMore size={20} />}
              sx={{
                px: 0.25,
                pl: 1 + level * 1.75,
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
                    color: colors.text,
                    fontWeight: 600,
                    "&:hover": { color: colors.primary },
                  }}
                >
                  {name}
                </Typography>
              ) : (
                <Typography sx={{ color: colors.text, fontWeight: 600 }}>{name}</Typography>
              )}
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, pb: 0.5, px: 0 }}>
              <MobileCategoryTree nodes={children} level={level + 1} onNodeClick={onNodeClick} />
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Stack>
  );
}

function UserAccountMenu({ anchorEl, open, onClose, loggedIn, loggingOut, onNavigate, onLogout }) {
  return (
    <Menu
      id="account-menu"
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      slotProps={{ paper: { sx: menuPaperSx } }}
    >
      {loggedIn
        ? [
            ...accountLinks.map(({ label, to, icon: Icon }) => (
              <MenuItem key={to} onClick={() => onNavigate(to)} sx={menuItemSx}>
                <Icon size={17} />
                {label}
              </MenuItem>
            )),
            <Divider key="account-divider" sx={{ my: 0.5 }} />,
            <MenuItem
              key="logout"
              disabled={loggingOut}
              onClick={() => void onLogout()}
              sx={{ ...menuItemSx, color: colors.primary }}
            >
              <FiLogOut size={17} />
              {loggingOut ? "Signing out…" : "Log out"}
            </MenuItem>,
          ]
        : [
            <MenuItem key="login" onClick={() => onNavigate("/login")} sx={menuItemSx}>
              <FiLogIn size={17} />
              Sign in
            </MenuItem>,
            <MenuItem key="signup" onClick={() => onNavigate("/signup")} sx={menuItemSx}>
              <FiUserPlus size={17} />
              Create account
            </MenuItem>,
          ]}
    </Menu>
  );
}

const CustomerNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(() => Boolean(getStoredAccessToken()));
  const [loggingOut, setLoggingOut] = useState(false);
  const [categoryTree, setCategoryTree] = useState([]);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
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


  const handleDrawerToggle = () => {
    setMobileOpen((open) => !open);
  };

  const closeDrawer = () => {
    setMobileOpen(false);
  };

  const openUserMenu = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const closeUserMenu = () => {
    setUserMenuAnchor(null);
  };

  const handleAccountNav = (to) => {
    closeUserMenu();
    closeDrawer();
    navigate(to);
  };

  const handleLogout = async () => {
    closeUserMenu();
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
      spacing={0.5}
      sx={{
        display: { xs: "none", md: "flex" },
        ml: "auto",
        flexShrink: 0,
        justifyContent: "flex-end",
      }}
    >
      <Button component={RouterLink} to="/" sx={linkButtonSx} startIcon={<FiHome size={navIconSize} />}>
        Home
      </Button>
      <Button
        component={RouterLink}
        to="/products"
        sx={linkButtonSx}
        startIcon={<FiShoppingBag size={navIconSize} />}
      >
        Shop
      </Button>
      <IconButton component={RouterLink} to="/cart" color="inherit" aria-label="Cart" size="small">
        <Badge color="primary" badgeContent={cart?.itemCount || 0} max={99}>
          <FiShoppingCart size={navIconBtnSize} />
        </Badge>
      </IconButton>
      {loggedIn ? (
        <IconButton component={RouterLink} to="/wishlist" color="inherit" aria-label="Wishlist" size="small">
          <Badge color="primary" badgeContent={wishlist?.total || 0} max={99}>
            <FiHeart size={navIconBtnSize} />
          </Badge>
        </IconButton>
      ) : null}
      <IconButton
        color="inherit"
        aria-label={loggedIn ? "Account menu" : "Sign in or create account"}
        size="small"
        onClick={openUserMenu}
        aria-controls={userMenuAnchor ? "account-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={userMenuAnchor ? "true" : undefined}
      >
        <FiUser size={navIconBtnSize} />
      </IconButton>
      {showAdminEntry ? (
        <Button
          component={RouterLink}
          to="/admin/dashboard"
          sx={{ ...linkButtonSx, color: colors.primary }}
          startIcon={<FiShield size={navIconSize} />}
        >
          Admin
        </Button>
      ) : null}
    </Stack>
  );

  const drawer = (
    <Box sx={{ pt: 1, pb: 2 }} role="presentation">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, pb: 1 }}>
        <Typography variant="subtitle1" fontWeight={700} color={colors.text}>
          Menu
        </Typography>
        <IconButton onClick={closeDrawer} aria-label="Close menu" size="small">
          <FiX size={22} />
        </IconButton>
      </Stack>
      <Divider />
      <List dense sx={{ px: 1, pt: 1 }}>
        <ListItemButton component={RouterLink} to="/" onClick={closeDrawer}>
          <ListItemIcon sx={drawerListIconSx}>
            <FiHome size={20} />
          </ListItemIcon>
          <ListItemText primary="Home" primaryTypographyProps={{ fontWeight: 600 }} />
        </ListItemButton>
        <ListItemButton component={RouterLink} to="/products" onClick={closeDrawer}>
          <ListItemIcon sx={drawerListIconSx}>
            <FiShoppingBag size={20} />
          </ListItemIcon>
          <ListItemText primary="Shop" primaryTypographyProps={{ fontWeight: 600 }} />
        </ListItemButton>
        <ListItemButton component={RouterLink} to="/cart" onClick={closeDrawer}>
          <ListItemIcon sx={drawerListIconSx}>
            <Badge color="primary" badgeContent={cart?.itemCount || 0} max={99}>
              <FiShoppingCart size={20} />
            </Badge>
          </ListItemIcon>
          <ListItemText primary="Cart" primaryTypographyProps={{ fontWeight: 600 }} />
        </ListItemButton>
        <ListItemButton component={RouterLink} to="/wishlist" onClick={closeDrawer}>
          <ListItemIcon sx={drawerListIconSx}>
            <Badge color="primary" badgeContent={wishlist?.total || 0} max={99}>
              <FiHeart size={20} />
            </Badge>
          </ListItemIcon>
          <ListItemText primary="Wishlist" primaryTypographyProps={{ fontWeight: 600 }} />
        </ListItemButton>
        {showAdminEntry ? (
          <ListItemButton component={RouterLink} to="/admin/dashboard" onClick={closeDrawer}>
            <ListItemIcon sx={drawerListIconSx}>
              <FiShield size={20} />
            </ListItemIcon>
            <ListItemText primary="Admin dashboard" primaryTypographyProps={{ fontWeight: 600 }} />
          </ListItemButton>
        ) : null}
      </List>
      <Divider sx={{ my: 1 }} />
      <Box sx={{ px: 1.25 }}>
        {loggedIn ? (
          <Accordion
            disableGutters
            elevation={0}
            sx={{
              bgcolor: "transparent",
              boxShadow: "none",
              mb: 1,
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
                Account
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, pb: 0.5, px: 0 }}>
              <Stack spacing={0.25}>
                {accountLinks.map(({ label, to, icon: Icon }) => (
                  <Button
                    key={to}
                    component={RouterLink}
                    to={to}
                    onClick={closeDrawer}
                    startIcon={<Icon size={18} />}
                    sx={{
                      justifyContent: "flex-start",
                      textTransform: "none",
                      fontWeight: 600,
                      color: colors.text,
                      pl: 1,
                      py: 0.75,
                      minHeight: 0,
                      borderRadius: 1.2,
                      "&:hover": { bgcolor: alpha(colors.primary, 0.08) },
                    }}
                  >
                    {label}
                  </Button>
                ))}
                <Button
                  disabled={loggingOut}
                  onClick={() => void handleLogout()}
                  startIcon={<FiLogOut size={18} />}
                  sx={{
                    justifyContent: "flex-start",
                    textTransform: "none",
                    fontWeight: 600,
                    color: colors.primary,
                    pl: 1,
                    py: 0.75,
                    minHeight: 0,
                    borderRadius: 1.2,
                    "&:hover": { bgcolor: alpha(colors.primary, 0.08) },
                  }}
                >
                  {loggingOut ? "Signing out…" : "Log out"}
                </Button>
              </Stack>
            </AccordionDetails>
          </Accordion>
        ) : (
          <Stack spacing={0.75} sx={{ mb: 1.5 }}>
            <Button
              component={RouterLink}
              to="/login"
              onClick={closeDrawer}
              variant="outlined"
              startIcon={<FiLogIn size={18} />}
              sx={{
                justifyContent: "flex-start",
                textTransform: "none",
                fontWeight: 600,
                borderColor: alpha(colors.primary, 0.45),
                color: colors.primary,
              }}
            >
              Sign in
            </Button>
            <Button
              component={RouterLink}
              to="/signup"
              onClick={closeDrawer}
              variant="contained"
              startIcon={<FiUserPlus size={18} />}
              sx={{
                justifyContent: "flex-start",
                textTransform: "none",
                fontWeight: 700,
                bgcolor: colors.buttonBackground,
                color: colors.buttonText,
                boxShadow: "none",
                "&:hover": { bgcolor: colors.buttonBackground, filter: "brightness(0.94)" },
              }}
            >
              Create account
            </Button>
          </Stack>
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
    </Box>
  );

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: alpha(colors.background, 0.92),
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${alpha(colors.text, 0.08)}`,
          color: colors.text,
        }}
      >
        <Toolbar
          sx={{
            maxWidth: 1200,
            width: "100%",
            mx: "auto",
            px: { xs: 1.5, sm: 2 },
            minHeight: { xs: 56, sm: 64 },
            gap: 1,
            justifyContent: "flex-start",
          }}
        >
          <IconButton
            color="inherit"
            aria-label="Open navigation menu"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ display: { md: "none" }, mr: 0.5 }}
          >
            <FiMenu size={22} />
          </IconButton>

          <Box
            component={RouterLink}
            to="/"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              textDecoration: "none",
              color: "inherit",
              flexGrow: { xs: 0, md: 0 },
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                background: `linear-gradient(135deg, ${alpha(colors.primary, 0.95)} 0%, ${colors.primary} 100%)`,
                boxShadow: `0 6px 18px ${alpha(colors.primary, 0.35)}`,
                flexShrink: 0,
              }}
            >
              <Typography sx={{ color: colors.onPrimary, fontWeight: 800, fontSize: 15, letterSpacing: -0.5 }}>S</Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                component="span"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: 16, sm: 17 },
                  lineHeight: 1.15,
                  display: "block",
                  letterSpacing: -0.3,
                }}
              >
                Shree Fashion
              </Typography>
              {loggedIn && displayName ? (
                <Typography
                  variant="caption"
                  sx={{
                    display: { xs: "none", sm: "block" },
                    color: alpha(colors.text, 0.55),
                    fontWeight: 500,
                    lineHeight: 1.2,
                    maxWidth: 200,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  Hi, {displayName}
                </Typography>
              ) : null}
            </Box>
          </Box>

          <Stack
            direction="row"
            alignItems="center"
            spacing={0}
            sx={{
              display: { xs: "flex", md: "none" },
              ml: "auto",
              flexShrink: 0,
              "& .MuiIconButton-root": { padding: { xs: "6px", sm: "8px" } },
            }}
          >
            <IconButton component={RouterLink} to="/cart" color="inherit" aria-label="Cart" size="small">
              <Badge color="primary" badgeContent={cart?.itemCount || 0} max={99}>
                <FiShoppingCart size={navIconSize} />
              </Badge>
            </IconButton>
            <IconButton component={RouterLink} to="/wishlist" color="inherit" aria-label="Wishlist" size="small">
              <Badge color="primary" badgeContent={wishlist?.total || 0} max={99}>
                <FiHeart size={navIconSize} />
              </Badge>
            </IconButton>
            <IconButton
              color="inherit"
              aria-label={loggedIn ? "Account menu" : "Sign in or create account"}
              size="small"
              onClick={openUserMenu}
              aria-controls={userMenuAnchor ? "account-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={userMenuAnchor ? "true" : undefined}
            >
              <FiUser size={navIconSize} />
            </IconButton>
          </Stack>

          {desktopNav}
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
            bgcolor: colors.background,
          },
        }}
      >
        {drawer}
      </Drawer>

      <UserAccountMenu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={closeUserMenu}
        loggedIn={loggedIn}
        loggingOut={loggingOut}
        onNavigate={handleAccountNav}
        onLogout={handleLogout}
      />
    </>
  );
};

export default CustomerNavbar;
