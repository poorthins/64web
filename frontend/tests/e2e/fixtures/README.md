# E2E Test Fixtures

This directory contains test files used in E2E tests.

## Required Files

### test-evidence.pdf
A sample PDF file for testing file uploads. Create a simple PDF or use:
```bash
echo "This is a test evidence document" > test-evidence.txt
# Convert to PDF using your preferred method
```

### test-image.jpg
A sample image file for testing image uploads. You can:
- Use any small JPG image (recommended size: < 100KB)
- Create one using an image editor
- Download a sample from placeholder services

## Creating Test Fixtures

You can create these files using various methods:

### Option 1: Manual Creation
1. Create a simple PDF in any PDF creator
2. Save a small image as JPG

### Option 2: Use Scripts
Run the fixture generation script (if available):
```bash
npm run generate-fixtures
```

### Option 3: Download Samples
```bash
# Example using curl (Linux/Mac)
curl -o test-evidence.pdf https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf
```

## Notes

- Keep file sizes small (< 1MB) to speed up tests
- Don't commit large binary files if using version control
- Add these files to .gitignore if they're auto-generated
