function SectionSkeleton() {
  return (
    <div
      style={{
        minHeight: '60vh',
        padding: '4rem 2rem',
        background: 'var(--bg)',
      }}
    >
      <div
        style={{
          width: '40%',
          height: 40,
          borderRadius: 8,
          background: 'var(--bg-2)',
        }}
      />
      <div
        style={{
          width: '60%',
          height: 20,
          borderRadius: 4,
          marginTop: 16,
          background: 'var(--bg-2)',
        }}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
          marginTop: 48,
        }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 200,
              borderRadius: 12,
              background: 'var(--bg-2)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default SectionSkeleton;
