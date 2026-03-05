import * as fs from 'fs';
import * as path from 'path';
import { McpError, ErrorCode } from './utils';

// Constants
export const TMP_DIR_NAME = 'tmp';
export const ABAP_FILE_EXTENSION = '.abap';
export const ABAP_CLASS_NAME_MAX_LENGTH = 30;

/**
 * File metadata interface
 */
export interface FileMetadata {
    path: string;
    fileName: string;
    size: number;
    lines: number;
    modified: string;
}

/**
 * Class name conversion result
 */
export interface ClassNameConversionResult {
    zClassName: string;
    wasConverted: boolean;
    wasTruncated: boolean;
}

/**
 * Get tmp directory path
 */
export function getTmpDir(): string {
    return path.join(process.cwd(), TMP_DIR_NAME);
}

/**
 * Ensure tmp directory exists
 */
export function ensureTmpDir(): void {
    try {
        const tmpDir = getTmpDir();
        fs.mkdirSync(tmpDir, { recursive: true }); // No-op if already exists
    } catch (error: any) {
        throw new McpError(
            ErrorCode.InternalError,
            `Failed to create tmp directory: ${error.message}`
        );
    }
}

/**
 * Build ABAP file name with extension
 */
export function buildAbapFileName(className: string): string {
    return `${className}${ABAP_FILE_EXTENSION}`;
}

/**
 * Convert standard SAP class names to Z-prefixed versions
 * Examples: CL_XXX → ZCL_XXX, IF_YYY → ZIF_YYY, TC_ZZZ → ZTC_ZZZ
 * Ensures name stays within ABAP's 30-character limit
 */
export function convertToZClassName(className: string): ClassNameConversionResult {
    const upperClassName = className.toUpperCase();

    // Check if already Z or Y prefixed
    if (upperClassName.startsWith('Z') || upperClassName.startsWith('Y')) {
        return {
            zClassName: upperClassName.substring(0, ABAP_CLASS_NAME_MAX_LENGTH),
            wasConverted: false,
            wasTruncated: upperClassName.length > ABAP_CLASS_NAME_MAX_LENGTH
        };
    }

    // Detect common SAP prefixes (2 or 3 letters followed by underscore)
    const prefixMatch = upperClassName.match(/^([A-Z]{2,3})_(.+)$/);

    let zClassName: string;
    if (prefixMatch) {
        // Has prefix like CL_, IF_, TC_, etc.
        const prefix = prefixMatch[1];
        const rest = prefixMatch[2];
        zClassName = `Z${prefix}_${rest}`;
    } else {
        // No standard prefix, just add Z_
        zClassName = `Z_${upperClassName}`;
    }

    // Truncate to 30 characters if needed
    const wasTruncated = zClassName.length > ABAP_CLASS_NAME_MAX_LENGTH;
    if (wasTruncated) {
        zClassName = zClassName.substring(0, ABAP_CLASS_NAME_MAX_LENGTH);
    }

    return {
        zClassName,
        wasConverted: true,
        wasTruncated
    };
}

/**
 * Count lines in source code
 */
export function countSourceLines(sourceCode: string): number {
    return sourceCode.split(/\r?\n/).length;
}

/**
 * Get file metadata without redundant stat calls
 */
export function getFileMetadata(filePath: string, sourceCode: string): FileMetadata {
    try {
        const stats = fs.statSync(filePath);
        const lines = countSourceLines(sourceCode);

        return {
            path: filePath,
            fileName: path.basename(filePath),
            size: Buffer.byteLength(sourceCode, 'utf-8'),
            lines,
            modified: stats.mtime.toISOString()
        };
    } catch (error: any) {
        throw new McpError(
            ErrorCode.InternalError,
            `Failed to retrieve file metadata for ${filePath}: ${error.message}`
        );
    }
}

/**
 * Read ABAP source file with validation (throws on error - no TOCTOU)
 */
export function readAbapSourceFile(filePath: string): string {
    try {
        const sourceCode = fs.readFileSync(filePath, 'utf-8');

        if (!sourceCode || sourceCode.trim().length === 0) {
            throw new McpError(
                ErrorCode.InvalidParams,
                `File ${path.basename(filePath)} is empty or contains no valid ABAP code.`
            );
        }

        return sourceCode;
    } catch (error: any) {
        if (error instanceof McpError) {
            throw error;
        }
        if (error.code === 'ENOENT') {
            throw new McpError(
                ErrorCode.InvalidParams,
                `File not found: ${filePath}\nPlease ensure the file exists in the ${TMP_DIR_NAME} folder or provide an absolute path.`
            );
        }
        throw new McpError(
            ErrorCode.InternalError,
            `Failed to read file ${filePath}: ${error.message}`
        );
    }
}

/**
 * Resolve file path with intelligent defaults
 */
export function resolveAbapFilePath(filePathOrName: string): string {
    // If absolute, use as-is
    if (path.isAbsolute(filePathOrName)) {
        return filePathOrName;
    }

    // If relative, resolve against tmp folder
    return path.join(getTmpDir(), filePathOrName);
}

/**
 * Extract class name from file name
 */
export function extractClassNameFromFile(filePath: string): string {
    const fileName = path.basename(filePath, ABAP_FILE_EXTENSION);
    return fileName.toUpperCase();
}

/**
 * Write ABAP source file to tmp folder
 */
export function writeAbapSourceFile(className: string, sourceCode: string): { filePath: string; metadata: FileMetadata } {
    try {
        ensureTmpDir();

        const fileName = buildAbapFileName(className);
        const filePath = path.join(getTmpDir(), fileName);

        fs.writeFileSync(filePath, sourceCode, 'utf-8');

        const metadata = getFileMetadata(filePath, sourceCode);

        return { filePath, metadata };
    } catch (error: any) {
        if (error instanceof McpError) {
            throw error;
        }
        throw new McpError(
            ErrorCode.InternalError,
            `Failed to write ABAP source file for class ${className}: ${error.message}`
        );
    }
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Check if a class name is in the local/customer namespace (Z* or Y*)
 */
export function isLocalClassName(className: string): boolean {
    const upper = className.toUpperCase();
    return upper.startsWith('Z') || upper.startsWith('Y');
}

/**
 * Check if an object is a SAP standard object (not Z* or Y*)
 */
export function isSapStandardObject(objectName: string): boolean {
    return !isLocalClassName(objectName);
}

/**
 * Validates class name follows Z/Y naming convention and ABAP naming rules
 * @param className - The class name to validate
 * @returns Uppercase validated class name
 * @throws McpError if validation fails
 */
export function validateLocalClassName(className: string): string {
    if (!className) {
        throw new McpError(ErrorCode.InvalidParams, 'Class name is required');
    }

    const upperClassName = className.toUpperCase();

    // Check Z/Y prefix for customer namespace
    if (!isLocalClassName(upperClassName)) {
        throw new McpError(
            ErrorCode.InvalidParams,
            'Class name must start with Z or Y for local development'
        );
    }

    // Check length limit
    if (upperClassName.length > ABAP_CLASS_NAME_MAX_LENGTH) {
        throw new McpError(
            ErrorCode.InvalidParams,
            `Class name must not exceed ${ABAP_CLASS_NAME_MAX_LENGTH} characters`
        );
    }

    // Check valid ABAP naming pattern
    const validPattern = /^[ZY][A-Z0-9_]*$/;
    if (!validPattern.test(upperClassName)) {
        throw new McpError(
            ErrorCode.InvalidParams,
            'Class name contains invalid characters. Use only A-Z, 0-9, and underscore'
        );
    }

    return upperClassName;
}

/**
 * Check if a package name is a local package (no transport required)
 */
export function isLocalPackage(packageName: string): boolean {
    return packageName === '$TMP' || packageName === '$LOCAL' || packageName.startsWith('$');
}

/**
 * Validates the package is local (no transport required)
 * @param packageName - The package name to validate
 * @throws McpError if package is not local
 */
export function validateLocalPackage(packageName: string): void {
    if (!isLocalPackage(packageName)) {
        throw new McpError(
            ErrorCode.InvalidParams,
            'Package must be local ($TMP, $LOCAL, or other $-prefixed packages)'
        );
    }
}
