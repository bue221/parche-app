import { THEME_STORAGE_KEY } from "@/lib/theme";

const THEME_BOOTSTRAP = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);var dark=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var d=document.documentElement;d.classList.toggle("dark",dark);d.classList.toggle("light",!dark);d.setAttribute("data-theme",dark?"dark":"light");d.style.colorScheme=dark?"dark":"light";}catch(e){}})();`;

function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }}
    />
  );
}

export { ThemeScript };
