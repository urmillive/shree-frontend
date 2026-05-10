import { Breadcrumbs, Link, Typography } from "@mui/material";

export default function BreadcrumbNav({ stack, onNavigate }) {
  return (
    <Breadcrumbs aria-label="category breadcrumb" sx={{ mb: 2 }}>
      <Link underline="hover" component="button" color="inherit" onClick={() => onNavigate(-1)}>
        Home
      </Link>
      {stack.map((node, index) => {
        const isLast = index === stack.length - 1;
        if (isLast) {
          return (
            <Typography key={node._id} color="text.primary" fontWeight={700}>
              {node.name}
            </Typography>
          );
        }
        return (
          <Link
            key={node._id}
            underline="hover"
            component="button"
            color="inherit"
            onClick={() => onNavigate(index)}
          >
            {node.name}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}
