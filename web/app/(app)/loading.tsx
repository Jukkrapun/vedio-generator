export default function Loading() {
  return <div className="stack" role="status" aria-label="กำลังโหลด"><div className="skeleton skeleton-heading" /><div className="skeleton-grid">{[0, 1, 2].map(index => <div className="skeleton" key={index} />)}</div><div className="skeleton" /></div>;
}
