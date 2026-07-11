// as: 'input' | 'textarea' — small aplica la variante compacta (edición de pesos).
export default function Input({ as = 'input', small = false, className = '', ...props }) {
  const cls = `input ${small ? 'input-small' : ''} ${className}`.trim()
  if (as === 'textarea') return <textarea className={cls} {...props} />
  return <input className={cls} {...props} />
}
