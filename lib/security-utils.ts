// Security utilities for assessment platform
export class SecurityManager {
  private static instance: SecurityManager
  private violations: SecurityViolation[] = []
  private isSecureMode = false
  private keystrokeBuffer: KeystrokeData[] = []
  private environmentScanInterval: NodeJS.Timeout | null = null

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager()
    }
    return SecurityManager.instance
  }

  // Enable secure assessment mode
  enableSecureMode(): Promise<boolean> {
    return new Promise((resolve) => {
      this.isSecureMode = true
      this.disableDevTools()
      this.preventCopyPaste()
      this.blockScreenCapture()
      this.detectVirtualMachine()
      this.startKeystrokeAnalysis()
      this.startEnvironmentScanning()
      resolve(true)
    })
  }

  // Start keystroke biometric analysis
  private startKeystrokeAnalysis(): void {
    document.addEventListener("keydown", this.handleKeyDown.bind(this))
    document.addEventListener("keyup", this.handleKeyUp.bind(this))
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const keystroke: KeystrokeData = {
      key: event.key,
      keyCode: event.keyCode,
      timestamp: Date.now(),
      dwellTime: 0,
      flightTime: 0,
      pressure: (event as any).force || 1,
      isDown: true,
    }

    // Calculate flight time (time between keystrokes)
    if (this.keystrokeBuffer.length > 0) {
      const lastKeystroke = this.keystrokeBuffer[this.keystrokeBuffer.length - 1]
      keystroke.flightTime = keystroke.timestamp - lastKeystroke.timestamp
    }

    this.keystrokeBuffer.push(keystroke)
    this.analyzeKeystrokePattern()
  }

  private handleKeyUp(event: KeyboardEvent): void {
    // Find corresponding keydown event and calculate dwell time
    const keydownIndex = this.keystrokeBuffer.findIndex((k) => k.key === event.key && k.isDown && k.dwellTime === 0)

    if (keydownIndex !== -1) {
      this.keystrokeBuffer[keydownIndex].dwellTime = Date.now() - this.keystrokeBuffer[keydownIndex].timestamp
      this.keystrokeBuffer[keydownIndex].isDown = false
    }
  }

  private analyzeKeystrokePattern(): void {
    if (this.keystrokeBuffer.length < 10) return

    // Keep only last 100 keystrokes for analysis
    if (this.keystrokeBuffer.length > 100) {
      this.keystrokeBuffer = this.keystrokeBuffer.slice(-100)
    }

    const recentKeystrokes = this.keystrokeBuffer.slice(-10)
    const avgDwellTime = recentKeystrokes.reduce((sum, k) => sum + k.dwellTime, 0) / recentKeystrokes.length
    const avgFlightTime = recentKeystrokes.reduce((sum, k) => sum + k.flightTime, 0) / recentKeystrokes.length

    // Detect anomalies in typing pattern
    const currentDwellTime = recentKeystrokes[recentKeystrokes.length - 1].dwellTime
    const currentFlightTime = recentKeystrokes[recentKeystrokes.length - 1].flightTime

    // Flag unusual patterns
    if (currentDwellTime > avgDwellTime * 3 || currentDwellTime < avgDwellTime * 0.3) {
      this.addViolation("keystroke_anomaly", "Unusual key dwell time detected")
    }

    if (currentFlightTime > avgFlightTime * 4 || currentFlightTime < avgFlightTime * 0.2) {
      this.addViolation("keystroke_anomaly", "Unusual typing rhythm detected")
    }

    // Detect copy-paste patterns (very fast sequential keystrokes)
    const fastKeystrokes = recentKeystrokes.filter((k) => k.flightTime < 50).length
    if (fastKeystrokes > 5) {
      this.addViolation("copy_paste_attempt", "Potential copy-paste activity detected")
    }
  }

  // Start continuous environment scanning
  private startEnvironmentScanning(): void {
    // Initial scan
    this.performEnvironmentScan()

    // Periodic scans every 30 seconds
    this.environmentScanInterval = setInterval(() => {
      this.performEnvironmentScan()
    }, 30000)
  }

  // Disable developer tools
  private disableDevTools(): void {
    // Detect F12 and other dev tool shortcuts
    document.addEventListener("keydown", (e) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.keyCode === 123 ||
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) ||
        (e.ctrlKey && e.keyCode === 85)
      ) {
        e.preventDefault()
        this.addViolation("dev_tools_attempt", "Developer tools access attempted")
        return false
      }
    })

    // Detect right-click
    document.addEventListener("contextmenu", (e) => {
      e.preventDefault()
      this.addViolation("right_click", "Right-click context menu blocked")
      return false
    })

    // Detect console usage with more sophisticated detection
    const devtools = { open: false, orientation: null }
    const threshold = 160

    setInterval(() => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold
      const heightThreshold = window.outerHeight - window.innerHeight > threshold

      if (widthThreshold || heightThreshold) {
        if (!devtools.open) {
          devtools.open = true
          this.addViolation("dev_tools_open", "Developer tools detected as open")
        }
      } else {
        devtools.open = false
      }
    }, 500)

    // Detect console.log overrides
    const originalLog = console.log
    console.log = (...args) => {
      this.addViolation("console_usage", "Console usage detected")
      return originalLog.apply(console, args)
    }
  }

  // Prevent copy-paste operations
  private preventCopyPaste(): void {
    const preventAction = (e: Event) => {
      e.preventDefault()
      this.addViolation("copy_paste_attempt", "Copy/paste operation blocked")
      return false
    }

    document.addEventListener("copy", preventAction)
    document.addEventListener("paste", preventAction)
    document.addEventListener("cut", preventAction)
    document.addEventListener("selectstart", preventAction)
    document.addEventListener("dragstart", preventAction)

    // Prevent keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && (e.key === "a" || e.key === "c" || e.key === "v" || e.key === "x")) {
        e.preventDefault()
        this.addViolation("keyboard_shortcut", `Keyboard shortcut ${e.key} blocked`)
        return false
      }
    })
  }

  // Block screen capture attempts
  private blockScreenCapture(): void {
    // Detect print screen
    document.addEventListener("keydown", (e) => {
      if (e.keyCode === 44) {
        e.preventDefault()
        this.addViolation("screen_capture", "Print screen key blocked")
        return false
      }
    })
  }

  // Detect virtual machine environment
  private detectVirtualMachine(): void {
    const checks = [
      // Check for common VM user agents
      () => /VMware|VirtualBox|QEMU|Xen|Parallels/i.test(navigator.userAgent),

      // Check for VM-specific properties
      () => {
        const canvas = document.createElement("canvas")
        const gl = canvas.getContext("webgl")
        if (gl) {
          const renderer = gl.getParameter(gl.RENDERER)
          return /VMware|VirtualBox|QEMU|Parallels|Virtual/i.test(renderer)
        }
        return false
      },

      // Check screen resolution (VMs often have specific resolutions)
      () => {
        const commonVMResolutions = ["1024x768", "1280x1024", "1366x768", "1440x900", "800x600"]
        const currentRes = `${screen.width}x${screen.height}`
        return commonVMResolutions.includes(currentRes) && screen.colorDepth === 24
      },

      // Check for VM-specific timing patterns
      () => {
        const start = performance.now()
        for (let i = 0; i < 1000000; i++) {
          Math.random()
        }
        const end = performance.now()
        // VMs typically have slower performance
        return end - start > 100
      },

      // Check hardware concurrency (VMs often have limited cores)
      () => navigator.hardwareConcurrency <= 2,

      // Check for VM-specific screen properties
      () => screen.availWidth !== screen.width || screen.availHeight !== screen.height,
    ]

    const vmIndicators = checks.filter((check) => check()).length
    if (vmIndicators >= 3) {
      this.addViolation("virtual_machine", `Virtual machine environment detected (${vmIndicators} indicators)`)
    }
  }

  // Monitor network activity
  monitorNetworkActivity(): void {
    // Override fetch to monitor API calls
    const originalFetch = window.fetch
    ;(window as any)._originalFetch = originalFetch
    window.fetch = async (...args) => {
      const url = args[0] as string

      // Block suspicious domains
      const blockedDomains = [
        "chatgpt.com",
        "openai.com",
        "claude.ai",
        "bard.google.com",
        "stackoverflow.com",
        "github.com",
        "codepen.io",
        "w3schools.com",
        "tutorialspoint.com",
        "geeksforgeeks.org",
      ]

      if (typeof url === "string" && blockedDomains.some((domain) => url.includes(domain))) {
        this.addViolation("blocked_domain", `Blocked access to ${url}`)
        throw new Error("Access to external resources is not allowed")
      }

      // Call original fetch with correct this binding (window)
      return originalFetch.apply(window, args as any)
    }

    // Monitor WebSocket connections without replacing constructor signature
    const OriginalWebSocket = window.WebSocket
    const WebSocketShim: typeof OriginalWebSocket = function (this: WebSocket, url: string | URL, protocols?: string | string[]) {
      try {
        SecurityManager.getInstance().addViolation("websocket", `WebSocket connection attempted to ${url}`)
      } catch {}
      // Allow connection (or you can block by throwing). We allow but log.
      // @ts-ignore - invoke original constructor
      return new OriginalWebSocket(url as any, protocols as any)
    } as any
    WebSocketShim.prototype = OriginalWebSocket.prototype
    // @ts-ignore
    WebSocketShim.CONNECTING = OriginalWebSocket.CONNECTING
    // @ts-ignore
    WebSocketShim.OPEN = OriginalWebSocket.OPEN
    // @ts-ignore
    WebSocketShim.CLOSING = OriginalWebSocket.CLOSING
    // @ts-ignore
    WebSocketShim.CLOSED = OriginalWebSocket.CLOSED
    // Install shim
    // @ts-ignore
    window.WebSocket = WebSocketShim
  }

  // Enhanced environment integrity check
  performEnvironmentScan(): Promise<EnvironmentScanResult> {
    return new Promise((resolve) => {
      const result: EnvironmentScanResult = {
        multipleMonitors: this.detectMultipleMonitors(),
        suspiciousProcesses: this.detectSuspiciousProcesses(),
        networkProxies: this.detectNetworkProxies(),
        browserExtensions: this.detectBrowserExtensions(),
        virtualMachine: this.detectVMEnvironment(),
        screenResolution: this.analyzeScreenResolution(),
        browserFingerprint: this.generateBrowserFingerprint(),
        riskScore: 0,
      }

      // Calculate comprehensive risk score
      result.riskScore =
        (result.multipleMonitors ? 15 : 0) +
        result.suspiciousProcesses.length * 20 +
        (result.networkProxies ? 25 : 0) +
        result.browserExtensions.length * 10 +
        (result.virtualMachine ? 30 : 0) +
        (result.screenResolution.suspicious ? 10 : 0)

      // Send scan results to backend
      this.sendEnvironmentScan(result)

      resolve(result)
    })
  }

  private detectMultipleMonitors(): boolean {
    // Check for multiple monitors using various methods
    const screenChecks = [
      screen.availWidth !== screen.width,
      screen.availHeight !== screen.height,
      window.screen.width !== window.innerWidth,
      (screen as any).mozOrientation !== undefined,
    ]

    return screenChecks.filter(Boolean).length >= 2
  }

  private detectSuspiciousProcesses(): string[] {
    const suspiciousApps = []

    // Check for common screen sharing/remote access tools in user agent
    const userAgent = navigator.userAgent.toLowerCase()
    const suspiciousPatterns = [
      "teamviewer",
      "anydesk",
      "chrome-remote-desktop",
      "vnc",
      "rdp",
      "logmein",
      "gotomeeting",
      "zoom",
      "skype",
      "discord",
    ]

    suspiciousPatterns.forEach((pattern) => {
      if (userAgent.includes(pattern)) {
        suspiciousApps.push(`Potential ${pattern} detected`)
      }
    })

    // Check for automation tools
    if ((window as any).webdriver || (navigator as any).webdriver) {
      suspiciousApps.push("WebDriver automation detected")
    }

    if ((window as any).phantom || (window as any)._phantom) {
      suspiciousApps.push("PhantomJS detected")
    }

    return suspiciousApps
  }

  private detectNetworkProxies(): boolean {
    // Check for proxy indicators
    const connection = (navigator as any).connection
    if (connection) {
      // Unusual connection types might indicate proxy
      return connection.type === "cellular" && connection.effectiveType === "4g"
    }

    // Check for common proxy ports in current URL
    const port = window.location.port
    const proxyPorts = ["8080", "3128", "8888", "9050"]
    return proxyPorts.includes(port)
  }

  private detectBrowserExtensions(): string[] {
    const extensions = []

    // Check for common extension indicators
    const extensionElements = document.querySelectorAll('[data-extension], [class*="extension"]')
    if (extensionElements.length > 0) {
      extensions.push("Browser extension elements detected")
    }

    // Check for ad blockers
    const testAd = document.createElement("div")
    testAd.innerHTML = "&nbsp;"
    testAd.className = "adsbox ad-banner advertisement"
    testAd.style.position = "absolute"
    testAd.style.left = "-9999px"
    document.body.appendChild(testAd)

    setTimeout(() => {
      if (testAd.offsetHeight === 0 || testAd.style.display === "none") {
        extensions.push("Ad blocker detected")
      }
      document.body.removeChild(testAd)
    }, 100)

    // Check for common extension global variables
    const extensionGlobals = ["chrome", "browser", "__firefox__", "__chrome__"]
    extensionGlobals.forEach((global) => {
      if ((window as any)[global] && typeof (window as any)[global] === "object") {
        extensions.push(`${global} extension API detected`)
      }
    })

    return extensions
  }

  private detectVMEnvironment(): boolean {
    const vmIndicators = [
      // Hardware checks
      navigator.hardwareConcurrency <= 2,

      // Performance checks
      this.performanceCheck() > 100,

      // Screen checks
      screen.colorDepth < 24,

      // WebGL checks
      this.checkWebGLRenderer(),

      // Timing checks
      this.checkTimingAccuracy(),
    ]

    return vmIndicators.filter(Boolean).length >= 2
  }

  private performanceCheck(): number {
    const start = performance.now()
    for (let i = 0; i < 100000; i++) {
      Math.sqrt(i)
    }
    return performance.now() - start
  }

  private checkWebGLRenderer(): boolean {
    const canvas = document.createElement("canvas")
    const gl = canvas.getContext("webgl")
    if (gl) {
      const renderer = gl.getParameter(gl.RENDERER)
      return /VMware|VirtualBox|QEMU|Virtual/i.test(renderer)
    }
    return false
  }

  private checkTimingAccuracy(): boolean {
    // Check if timing APIs have been modified (common in VMs)
    const start = Date.now()
    const perfStart = performance.now()

    setTimeout(() => {}, 0)

    const timeDiff = Math.abs(Date.now() - start - (performance.now() - perfStart))
    return timeDiff > 10 // Significant timing discrepancy
  }

  private analyzeScreenResolution(): { width: number; height: number; suspicious: boolean } {
    const commonResolutions = [
      "1920x1080",
      "1366x768",
      "1536x864",
      "1440x900",
      "1280x720",
      "1024x768",
      "800x600",
      "1280x1024",
      "1600x900",
      "2560x1440",
    ]

    const currentRes = `${screen.width}x${screen.height}`
    const suspicious = !commonResolutions.includes(currentRes) || screen.width < 1024 || screen.height < 768

    return {
      width: screen.width,
      height: screen.height,
      suspicious,
    }
  }

  private generateBrowserFingerprint(): string {
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      hardwareConcurrency: navigator.hardwareConcurrency,
      maxTouchPoints: navigator.maxTouchPoints,
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }

    return btoa(JSON.stringify(fingerprint))
  }

  private async sendEnvironmentScan(scanResult: EnvironmentScanResult): Promise<void> {
    try {
      const baseFetch: typeof fetch = (window as any)._originalFetch || fetch
      // Report as a low severity proctoring event/violation with payload the backend expects
      await baseFetch("/api/proctoring/violation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: this.getCurrentAssessmentId(),
          violationType: "environment_scan",
          severity: "low",
          message: "Periodic environment scan report",
          data: scanResult,
        }),
      })
    } catch (error) {
      console.error("Failed to send environment scan:", error)
    }
  }

  private getCurrentAssessmentId(): string {
    // Extract assessment ID from current URL
    const pathParts = window.location.pathname.split("/")
    const assessmentIndex = pathParts.indexOf("assessments")
    return assessmentIndex !== -1 ? pathParts[assessmentIndex + 1] : ""
  }

  // Get keystroke pattern data
  getKeystrokePattern(): KeystrokeData[] {
    return [...this.keystrokeBuffer]
  }

  // Add security violation
  private addViolation(type: string, message: string): void {
    const violation: SecurityViolation = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      timestamp: new Date(),
      severity: this.getViolationSeverity(type),
    }

    this.violations.push(violation)

    // Send to backend
    this.reportViolation(violation)
  }

  private getViolationSeverity(type: string): "low" | "medium" | "high" {
    const highSeverity = ["dev_tools_open", "virtual_machine", "screen_share", "websocket"]
    const mediumSeverity = ["copy_paste_attempt", "blocked_domain", "keystroke_anomaly", "console_usage"]

    if (highSeverity.includes(type)) return "high"
    if (mediumSeverity.includes(type)) return "medium"
    return "low"
  }

  private async reportViolation(violation: SecurityViolation): Promise<void> {
    try {
      const baseFetch: typeof fetch = (window as any)._originalFetch || fetch
      await baseFetch("/api/proctoring/violation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: this.getCurrentAssessmentId(),
          violationType: violation.type,
          severity: violation.severity,
          message: violation.message,
          data: { id: violation.id, timestamp: violation.timestamp },
        }),
      })
    } catch (error) {
      console.error("Failed to report security violation:", error)
    }
  }

  // Get all violations
  getViolations(): SecurityViolation[] {
    return [...this.violations]
  }

  // Clear violations
  clearViolations(): void {
    this.violations = []
  }

  // Disable secure mode
  disableSecureMode(): void {
    this.isSecureMode = false

    if (this.environmentScanInterval) {
      clearInterval(this.environmentScanInterval)
    }

    // Clean up event listeners
    document.removeEventListener("contextmenu", () => {})
    document.removeEventListener("keydown", () => {})
    document.removeEventListener("copy", () => {})
    document.removeEventListener("paste", () => {})
  }
}

// Enhanced Types
interface SecurityViolation {
  id: string
  type: string
  message: string
  timestamp: Date
  severity: "low" | "medium" | "high"
}

interface KeystrokeData {
  key: string
  keyCode: number
  timestamp: number
  dwellTime: number
  flightTime: number
  pressure: number
  isDown: boolean
}

interface EnvironmentScanResult {
  multipleMonitors: boolean
  suspiciousProcesses: string[]
  networkProxies: boolean
  browserExtensions: string[]
  virtualMachine: boolean
  screenResolution: {
    width: number
    height: number
    suspicious: boolean
  }
  browserFingerprint: string
  riskScore: number
}

// Export singleton instance
export const securityManager = SecurityManager.getInstance()
