"use client"

export const exportToPDF = async (elementId: string, filename = "resume.pdf") => {
  try {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error("Element not found")
    }

    // Create a new window for printing
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      throw new Error("Could not open print window")
    }

    // Get the resume content
    const resumeContent = element.innerHTML

    // Create a complete HTML document for printing
    const printDocument = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${filename}</title>
          <meta charset="utf-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.5;
              color: #000;
              background: white;
              padding: 0;
              margin: 0;
            }
            
            .bg-white { background-color: white !important; }
            .text-black { color: black !important; }
            .text-gray-700 { color: #374151 !important; }
            .text-gray-800 { color: #1f2937 !important; }
            .text-gray-600 { color: #4b5563 !important; }
            .text-blue-600 { color: #2563eb !important; }
            
            .font-sans { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            
            .text-xs { font-size: 0.75rem; }
            .text-sm { font-size: 0.875rem; }
            .text-base { font-size: 1rem; }
            .text-lg { font-size: 1.125rem; }
            .text-xl { font-size: 1.25rem; }
            .text-2xl { font-size: 1.5rem; }
            
            .p-8 { padding: 2rem; }
            .p-4 { padding: 1rem; }
            .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
            .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mt-2 { margin-top: 0.5rem; }
            .mt-1 { margin-top: 0.25rem; }
            .ml-4 { margin-left: 1rem; }
            
            .flex { display: flex; }
            .flex-wrap { flex-wrap: wrap; }
            .items-center { align-items: center; }
            .items-start { align-items: flex-start; }
            .justify-center { justify-content: center; }
            .justify-between { justify-content: space-between; }
            .gap-1 { gap: 0.25rem; }
            .gap-2 { gap: 0.5rem; }
            .gap-4 { gap: 1rem; }
            .gap-6 { gap: 1.5rem; }
            
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            
            .border-b { border-bottom: 1px solid #d1d5db; }
            .border-gray-300 { border-color: #d1d5db; }
            .pb-1 { padding-bottom: 0.25rem; }
            
            .bg-gray-100 { background-color: #f3f4f6; }
            .rounded { border-radius: 0.25rem; }
            
            .list-disc { list-style-type: disc; }
            .list-inside { list-style-position: inside; }
            .space-y-1 > * + * { margin-top: 0.25rem; }
            
            .underline { text-decoration: underline; }
            .tracking-wide { letter-spacing: 0.025em; }
            .leading-relaxed { line-height: 1.625; }
            
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            
            .w-3 { width: 0.75rem; }
            .h-3 { height: 0.75rem; }
            .w-5 { width: 1.25rem; }
            .h-5 { height: 1.25rem; }
            
            .max-w-none { max-width: none; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .shadow-lg { box-shadow: none; }
            
            /* Print-specific styles */
            @media print {
              body { 
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .bg-gray-100 { 
                background-color: #f3f4f6 !important;
                -webkit-print-color-adjust: exact;
              }
              
              .text-blue-600 { 
                color: #2563eb !important;
                -webkit-print-color-adjust: exact;
              }
            }
            
            /* Hide Lucide icons in print */
            svg {
              display: none;
            }
          </style>
        </head>
        <body>
          ${resumeContent}
        </body>
      </html>
    `

    // Write the document to the print window
    printWindow.document.write(printDocument)
    printWindow.document.close()

    // Wait for the content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }

    return true
  } catch (error) {
    console.error("Error generating PDF:", error)
    return false
  }
}

// Alternative: Export as HTML file
export const exportToHTML = (elementId: string, filename = "resume.html") => {
  try {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error("Element not found")
    }

    const resumeContent = element.innerHTML

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Resume - ${filename}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.5;
              color: #000;
              background: white;
              padding: 20px;
              max-width: 8.5in;
              margin: 0 auto;
            }
            
            /* Include all the styles from above */
            .bg-white { background-color: white !important; }
            .text-black { color: black !important; }
            .text-gray-700 { color: #374151 !important; }
            .text-gray-800 { color: #1f2937 !important; }
            .text-gray-600 { color: #4b5563 !important; }
            .text-blue-600 { color: #2563eb !important; }
            
            .font-sans { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            
            .text-xs { font-size: 0.75rem; }
            .text-sm { font-size: 0.875rem; }
            .text-base { font-size: 1rem; }
            .text-lg { font-size: 1.125rem; }
            .text-xl { font-size: 1.25rem; }
            .text-2xl { font-size: 1.5rem; }
            
            .p-8 { padding: 2rem; }
            .p-4 { padding: 1rem; }
            .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
            .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mt-2 { margin-top: 0.5rem; }
            .mt-1 { margin-top: 0.25rem; }
            .ml-4 { margin-left: 1rem; }
            
            .flex { display: flex; }
            .flex-wrap { flex-wrap: wrap; }
            .items-center { align-items: center; }
            .items-start { align-items: flex-start; }
            .justify-center { justify-content: center; }
            .justify-between { justify-content: space-between; }
            .gap-1 { gap: 0.25rem; }
            .gap-2 { gap: 0.5rem; }
            .gap-4 { gap: 1rem; }
            .gap-6 { gap: 1.5rem; }
            
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            
            .border-b { border-bottom: 1px solid #d1d5db; }
            .border-gray-300 { border-color: #d1d5db; }
            .pb-1 { padding-bottom: 0.25rem; }
            
            .bg-gray-100 { background-color: #f3f4f6; }
            .rounded { border-radius: 0.25rem; }
            
            .list-disc { list-style-type: disc; }
            .list-inside { list-style-position: inside; }
            .space-y-1 > * + * { margin-top: 0.25rem; }
            
            .underline { text-decoration: underline; }
            .tracking-wide { letter-spacing: 0.025em; }
            .leading-relaxed { line-height: 1.625; }
            
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            
            .w-3 { width: 0.75rem; }
            .h-3 { height: 0.75rem; }
            .w-5 { width: 1.25rem; }
            .h-5 { height: 1.25rem; }
            
            .max-w-none { max-width: none; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
            
            /* Hide icons */
            svg { display: none; }
            
            @media print {
              body { 
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          ${resumeContent}
        </body>
      </html>
    `

    // Create and download the HTML file
    const blob = new Blob([htmlContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    return true
  } catch (error) {
    console.error("Error exporting HTML:", error)
    return false
  }
}
