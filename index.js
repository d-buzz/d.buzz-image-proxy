const axios = require("axios")
const express = require("express")
const app = express()
const cors = require("cors")
const fs = require("fs")
const path = require("path")
const sharp = require("sharp")

app.use(cors())

const getPlaceholderImage = async () => {
  try {
    const imagePath = path.join("assets", "default.jpg")
    return await fs.promises.readFile(imagePath)
  } catch (error) {
    console.error("Error reading the placeholder image:", error.message)
    return Buffer.alloc(0)
  }
}

const isValidUrl = (url) => {
  try {
    new URL(url)
    return true
  } catch (error) {
    return false
  }
}

async function isValidImage(imageBuffer) {
  try {
    await sharp(imageBuffer).metadata()
    return true
  } catch (error) {
    return false
  }
}

const compressImage = async (buffer) => {
  if (await isValidImage(buffer)) {
    try {
      let quality = 90
      let compressedImage = await sharp(buffer).jpeg({ quality }).toBuffer()

      while (compressedImage.byteLength > 500 * 1024 && quality > 10) {
        quality -= 5
        compressedImage = await sharp(buffer).jpeg({ quality }).toBuffer()
      }

      return compressedImage
    } catch (error) {
      console.error('Error compressing image:', error.message)
      return buffer
    }
  } else {
    console.error('Invalid image file. Skipping compression.')
    return buffer
  }
}

app.get("/proxy/*", async (req, res) => {
  const imageUrl = req.params[0]

  if (isValidUrl(imageUrl)) {
    try {
      const response = await axios.get(imageUrl, { responseType: "arraybuffer" })
      if (response.status === 200) {
        const compressedImage = await compressImage(response.data)
        res.setHeader("Content-Type", "image/jpeg")
        res.setHeader("Content-Disposition", "inline")
        res.send(compressedImage)
      } else {
        const placeholderImage = await getPlaceholderImage()
        res.setHeader("Content-Type", "image/png")
        res.setHeader("Content-Disposition", "inline")
        res.send(placeholderImage)
      }
    } catch (error) {
      const placeholderImage = await getPlaceholderImage()
      res.setHeader("Content-Type", "image/png")
      res.setHeader("Content-Disposition", "inline")
      res.send(placeholderImage)
    }
  } else {
    const placeholderImage = await getPlaceholderImage()
    res.setHeader("Content-Type", "image/png")
    res.setHeader("Content-Disposition", "inline")
    res.send(placeholderImage)
  }
})

app.listen(8000, () => {
  console.log("Image proxy service running on port 8000")
})
