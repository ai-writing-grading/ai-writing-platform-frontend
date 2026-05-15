import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Nav } from '../components/Nav.tsx'

export const Route = createRootRoute({
  component: () => (
    <>
      <Nav />
      <Outlet />
    </>
  ),
})