import { listen } from "@colyseus/tools";
import app from "./app.config";

// Start the Colyseus server using @colyseus/tools
// This automatically uses process.env.PORT or defaults to 2567
listen(app);