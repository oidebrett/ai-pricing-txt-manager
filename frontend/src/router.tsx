import { lazy, type ReactNode, Suspense } from "react";
import { createBrowserRouter, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { userRoutes } from "./user-routes";

export const SuspenseWrapper = ({ children }: { children: ReactNode }) => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {children}
    </Suspense>
  );
};

// Add a proper error boundary component
export function ErrorBoundary() {
  const error = useRouteError();
  
  if (isRouteErrorResponse(error)) {
    return (
      <div className="error-container">
        <h2>Error {error.status}</h2>
        <p>{error.statusText || error.data}</p>
      </div>
    );
  } else if (error instanceof Error) {
    return (
      <div className="error-container">
        <h2>Something went wrong</h2>
        <p>{error.message}</p>
        {import.meta.env.DEV && <pre>{error.stack}</pre>}
      </div>
    );
  } else {
    return (
      <div className="error-container">
        <h2>Unexpected Error</h2>
        <p>An unexpected error occurred.</p>
      </div>
    );
  }
}

const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const SomethingWentWrongPage = lazy(
  () => import("./pages/SomethingWentWrongPage"),
);

export const router = createBrowserRouter(
  [
    ...userRoutes.map(route => ({
      ...route,
      element: <SuspenseWrapper>{route.element}</SuspenseWrapper>,
      errorElement: <ErrorBoundary />
    })),
    {
      path: "*",
      element: (
        <SuspenseWrapper>
          <NotFoundPage />
        </SuspenseWrapper>
      ),
      errorElement: (
        <SuspenseWrapper>
          <SomethingWentWrongPage />
        </SuspenseWrapper>
      ),
    },
  ]
);
