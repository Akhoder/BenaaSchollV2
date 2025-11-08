// Server component layout for static export compatibility
export async function generateStaticParams() {
  return []; // Empty array allows dynamic generation at runtime
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

