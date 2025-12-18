import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/index.tsx"),
  route("welcome", "routes/home.tsx"),
  route("app", "routes/app.tsx", [
    index("routes/app.dashboard.tsx"),
    route("clock", "routes/app.clock.tsx"),
    route("photos", "routes/app.photos.tsx", [
      index("routes/app.photos.feed.tsx"),
      route("gallery", "routes/app.photos.gallery.tsx"),
    ]),
    route("manage", "routes/app.manage.tsx"),
  ]),
] satisfies RouteConfig;
