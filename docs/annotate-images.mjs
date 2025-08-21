#!/usr/bin/env node

/**
 * ProofKit Screenshot Annotation Tool
 *
 * Optional image annotation using Sharp to overlay step numbers on screenshots.
 * Falls back gracefully if Sharp is not available.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join, dirname, extname, basename } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ImageAnnotator {
  constructor() {
    this.docsDir = __dirname;
    this.screenshotsDir = join(this.docsDir, "screenshots", "funnel");
    this.annotatedDir = join(this.docsDir, "screenshots", "funnel-annotated");
    this.sharp = null;

    // Try to load Sharp (optional dependency)
    this.initializeSharp();
  }

  /**
   * Try to initialize Sharp library
   */
  async initializeSharp() {
    try {
      // Dynamic import to handle optional dependency
      const sharp = await import("sharp");
      this.sharp = sharp.default;
      console.log("✅ Sharp loaded successfully for image annotation");
      return true;
    } catch (error) {
      console.log("ℹ️  Sharp not available - skipping image annotation");
      console.log("   Install with: npm install sharp (optional)");
      return false;
    }
  }

  /**
   * Annotate all funnel screenshots with step numbers
   */
  async annotateScreenshots() {
    if (!this.sharp) {
      console.log("⏭️  Skipping image annotation (Sharp not available)");
      return { success: true, annotated: 0, message: "Sharp not available" };
    }

    try {
      console.log("🎨 Annotating funnel screenshots...");

      // Ensure output directory exists
      if (!existsSync(this.annotatedDir)) {
        mkdirSync(this.annotatedDir, { recursive: true });
      }

      // Get all PNG files from screenshots directory
      const screenshots = this.getScreenshots();
      console.log(`📸 Found ${screenshots.length} screenshots to annotate`);

      let annotatedCount = 0;

      for (const screenshot of screenshots) {
        try {
          await this.annotateImage(screenshot);
          annotatedCount++;
        } catch (error) {
          console.warn(
            `⚠️  Failed to annotate ${screenshot.filename}:`,
            error.message,
          );
        }
      }

      console.log(
        `✅ Annotated ${annotatedCount} of ${screenshots.length} screenshots`,
      );

      return {
        success: true,
        annotated: annotatedCount,
        total: screenshots.length,
      };
    } catch (error) {
      console.error("❌ Screenshot annotation failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get list of screenshots to annotate
   */
  getScreenshots() {
    if (!existsSync(this.screenshotsDir)) {
      return [];
    }

    const files = readdirSync(this.screenshotsDir)
      .filter((file) => extname(file).toLowerCase() === ".png")
      .filter((file) => /^\d{2}-/.test(file)) // Only numbered screenshots
      .map((file) => {
        const stepMatch = file.match(/^(\d{2})-(.+)\.png$/);
        return {
          filename: file,
          filepath: join(this.screenshotsDir, file),
          outputPath: join(this.annotatedDir, file),
          stepNumber: stepMatch ? parseInt(stepMatch[1]) : 0,
          stepName: stepMatch ? stepMatch[2] : file,
        };
      })
      .sort((a, b) => a.stepNumber - b.stepNumber);

    return files;
  }

  /**
   * Annotate a single image with step number
   */
  async annotateImage(screenshot) {
    const { filepath, outputPath, stepNumber } = screenshot;

    // Create step number overlay
    const stepText = stepNumber.toString();
    const circleSize = 60;
    const fontSize = 24;

    // Create SVG overlay with step number
    const svgOverlay = `
      <svg width="${circleSize}" height="${circleSize}">
        <circle cx="${circleSize / 2}" cy="${circleSize / 2}" r="${(circleSize - 4) / 2}" 
                fill="#FF6B35" stroke="#FFFFFF" stroke-width="3"/>
        <text x="${circleSize / 2}" y="${circleSize / 2 + fontSize / 3}" 
              text-anchor="middle" 
              font-family="Arial, sans-serif" 
              font-size="${fontSize}" 
              font-weight="bold" 
              fill="#FFFFFF">
          ${stepText}
        </text>
      </svg>
    `;

    // Apply overlay to top-left corner
    await this.sharp(filepath)
      .composite([
        {
          input: Buffer.from(svgOverlay),
          top: 20,
          left: 20,
        },
      ])
      .png()
      .toFile(outputPath);

    console.log(`✨ Annotated: ${screenshot.filename} → step ${stepNumber}`);
  }

  /**
   * Generate a test execution summary
   */
  generateSummary(steps) {
    const summaryFile = join(this.docsDir, "funnel-generation-summary.json");

    const summary = {
      generatedAt: new Date().toISOString(),
      generator: "ProofKit Funnel Doc Generator v1.0",
      input: {
        stepsFile: this.stepsFile,
        screenshotsDir: this.screenshotsDir,
        totalSteps: steps.length,
      },
      output: {
        documentationFile: this.outputFile,
        annotatedDir: this.annotatedDir,
        generatedPages: 1,
      },
      coverage: {
        hasScreenshots: steps.filter((step) => step.screenshot).length,
        hasRoutes: steps.filter((step) => step.route).length,
        hasExpectations: steps.filter((step) => step.expect).length,
        completeCoverage:
          steps.length > 0 &&
          steps.every((step) => step.screenshot && step.expect && step.label),
      },
      steps: steps.map((step) => ({
        number: step.stepNumber,
        label: step.label,
        hasScreenshot: !!step.screenshot,
        hasExpectation: !!step.expect,
        timestamp: step.timestamp,
      })),
    };

    writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    console.log(`📋 Generation summary: ${summaryFile}`);
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("ProofKit Funnel Documentation Generator");
  console.log("=====================================");

  const generator = new ImageAnnotator();

  Promise.resolve()
    .then(() => generator.generate())
    .then((result) => {
      if (result.success) {
        console.log("\n🎉 Documentation generation completed successfully!");

        // Also run image annotation if Sharp is available
        return generator.annotateScreenshots();
      } else {
        throw new Error(result.error);
      }
    })
    .then((annotationResult) => {
      if (annotationResult.success && annotationResult.annotated > 0) {
        console.log(
          `\n🎨 Image annotation completed: ${annotationResult.annotated} images`,
        );
      } else if (annotationResult.message) {
        console.log(`\nℹ️  ${annotationResult.message}`);
      }

      console.log("\n✅ All tasks completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Fatal error:", error.message);
      process.exit(1);
    });
}

export default ImageAnnotator;
