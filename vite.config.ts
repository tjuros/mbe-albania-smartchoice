import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function enableRemoteRuntime(): Plugin {
  return {
    name: "enable-dhl-remote-runtime",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith("/src/main.tsx") || code.includes('import "./remoteRuntime";')) return null;
      return code.replace(
        'import "./dhlRuntime";',
        'import "./dhlRuntime";\nimport "./remoteRuntime";',
      );
    },
    transformIndexHtml(html) {
      return html
        .replace(
          'const domestic = !inbound && select.value === "AL";\n        wrapper.hidden = domestic;',
          'wrapper.hidden = false;',
        )
        .replace(
          'Përdoret për kontrollin automatik të zonës së largët DHL.',
          'Përdoret për kontrollin e itinerarit, zonës dhe tarifave shtesë.',
        )
        .replace(
          'Used for automatic DHL remote-area checking.',
          'Used for route, zone and surcharge checks.',
        );
    },
  };
}

export default defineConfig({
  plugins: [enableRemoteRuntime(), react()],
});
