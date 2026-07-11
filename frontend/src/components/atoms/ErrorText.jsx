export default function ErrorText({ children }) {
  if (!children) return null
  return <p className="error" data-testid="error-text">{children}</p>
}
