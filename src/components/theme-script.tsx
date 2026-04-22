export function ThemeScript() {
  const code = `
    (function() {
      try {
        var stored = localStorage.getItem('splash-theme');
        var sys = window.matchMedia('(prefers-color-scheme: dark)').matches;
        var dark = stored ? stored === 'dark' : sys;
        if (dark) document.documentElement.classList.add('dark');
      } catch (e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
