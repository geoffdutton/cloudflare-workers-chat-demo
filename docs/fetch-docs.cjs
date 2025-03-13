const fs = require('fs/promises')
const path = require('path')

const docsPath = path.join(__dirname)

async function main() {
  try {
    // Read and parse the registry of docs to fetch.
    const registryPath = path.join(docsPath, 'registry.json')
    const registryData = await fs.readFile(registryPath, 'utf8')
    const registry = JSON.parse(registryData)

    // Process each document.
    for (const doc of registry.docs_to_fetch) {
      console.log(`Fetching "${doc.name}" from ${doc.url}`)
      const response = await fetch(doc.url)
      if (!response.ok) {
        console.error(
          `Failed to fetch ${doc.url}: ${response.status} ${response.statusText}`,
        )
        continue
      }
      const content = await response.text()

      // Extract extension from URL; default to .txt if none found.
      const urlPath = new URL(doc.url).pathname
      const ext = path.extname(urlPath) || '.txt'

      // Sanitize the doc name to create a safe filename.
      const sanitizedName = doc.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, '')
      const fileName = sanitizedName + ext
      const filePath = path.join(__dirname, fileName)

      const lastFetchTime = new Date().toISOString()
      console.log(`Last fetched: ${lastFetchTime}`)

      const finalContent = `doc_name: ${doc.name}\ndoc_url: ${doc.url}\nlast_fetched: ${lastFetchTime}\n\n${content}`

      await fs.writeFile(filePath, finalContent, 'utf8')
      console.log(`Saved content to ${filePath}`)
    }
  } catch (error) {
    console.error('Error occurred:', error)
  }
}

if (require.main === module) {
  main()
}
