import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import './index.css'

// 导入由 Vite 插件自动生成的路由树
import { routeTree } from './routeTree.gen'

// 创建路由实例
const router = createRouter({ routeTree })

// TypeScript 类型声明
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)