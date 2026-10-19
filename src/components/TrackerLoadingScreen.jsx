export default function TrackerLoadingScreen({ theme, palette }) {
  return (
    <main
      className="ct ct-loading"
      data-theme={theme}
      data-palette={palette}
      aria-live="polite"
      aria-busy="true"
    >
      <header className="loading-topbar">
        <span className="loading-brand">CAR TRACKER</span>
      </header>
      <div className="loading-scene">
        <div className="loading-sun" />
        <div className="loading-hill loading-hill-back" />
        <div className="loading-hill loading-hill-front" />
        <div className="loading-road">
          <span className="road-dash" />
          <span className="road-dash" />
          <span className="road-dash" />
          <svg className="loading-car" viewBox="0 0 180 92" role="img" aria-label="Car driving">
            <path d="M24 56 35 32c3-7 9-11 17-11h55c8 0 14 3 19 10l17 25 13 5c5 2 8 6 8 12v7H15v-9c0-7 3-11 9-13Z" fill="currentColor" />
            <path d="m49 35-8 18h36V29H54c-2 0-4 2-5 6Zm37-6v24h49l-14-20c-2-3-5-4-9-4H86Z" fill="var(--car-glass)" />
            <path d="M20 61h139" stroke="var(--car-highlight)" strokeWidth="4" strokeLinecap="round" />
            <circle cx="48" cy="76" r="13" fill="var(--car-wheel)" />
            <circle cx="48" cy="76" r="5" fill="var(--car-hub)" />
            <circle cx="137" cy="76" r="13" fill="var(--car-wheel)" />
            <circle cx="137" cy="76" r="5" fill="var(--car-hub)" />
            <path d="M24 58h9m125 0h9" stroke="var(--car-light)" strokeWidth="5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <div className="loading-copy">
        <span className="loading-kicker">YOUR DAILY DRIVE</span>
        <h1>Getting your records ready</h1>
        <p>Connecting to your tracker and gathering your journeys…</p>
        <div className="loading-progress"><span /></div>
        <span className="loading-caption">Just a moment</span>
      </div>
    </main>
  );
}
