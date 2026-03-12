import * as fs from 'fs';
import * as path from 'path';
import { McpError, ErrorCode } from './utils';

// ============================================================================
// CONSTANTS
// ============================================================================

export const TMP_DIR_NAME = 'tmp';

/**
 * Standard ABAP object type file extensions
 * Based on abapGit and Eclipse ADT conventions
 */
export const ABAP_FILE_EXTENSIONS = {
    // Legacy/generic extension
    ABAP: '.abap',

    // ABAP OO Objects
    CLASS: '.clas.abap',
    INTERFACE: '.intf.abap',

    // Programs and Includes
    PROGRAM: '.prog.abap',
    FUNCTION_GROUP: '.fugr.abap',

    // CDS and RAP Objects
    CDS_DDL: '.ddls.asddls',           // Data Definition Language Source
    CDS_DCL: '.dcls.asdcls',           // Data Control Language Source (Access Control)
    CDS_METADATA_EXT: '.ddlx.asddlxs', // Metadata Extension
    BEHAVIOR_DEF: '.bdef.asbdef',       // Behavior Definition
} as const;

/**
 * @deprecated Use ABAP_FILE_EXTENSIONS.ABAP or specific type extensions instead
 */
export const ABAP_FILE_EXTENSION = ABAP_FILE_EXTENSIONS.ABAP;

/**
 * ABAP object name constraints
 */
export const ABAP_CLASS_NAME_MAX_LENGTH = 30;
export const ABAP_SQL_VIEW_NAME_MAX_LENGTH = 16;

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
 * Name conversion result for any ABAP object
 */
export interface ObjectNameConversionResult {
    zObjectName: string;
    wasConverted: boolean;
    wasTruncated: boolean;
}

/**
 * @deprecated Use ObjectNameConversionResult instead
 */
export interface ClassNameConversionResult extends ObjectNameConversionResult {
    /** @deprecated Use zObjectName instead */
    zClassName: string;
}

/**
 * Supported ABAP object types for file operations
 */
export type AbapObjectType =
    | 'CLAS'  // Class
    | 'INTF'  // Interface
    | 'PROG'  // Program
    | 'FUGR'  // Function Group
    | 'DDLS'  // CDS DDL Source
    | 'DCLS'  // CDS Access Control
    | 'DDLX'  // CDS Metadata Extension
    | 'BDEF'; // Behavior Definition

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
        throw new McpError(ErrorCode.InternalError, `Failed to create tmp directory: ${error.message}`);
    }
}

/**
 * Build ABAP file name with extension
 * @deprecated Use buildObjectFileName with object type instead
 */
export function buildAbapFileName(className: string): string {
    return `${className}${ABAP_FILE_EXTENSIONS.ABAP}`;
}

/**
 * Get file extension for a specific ABAP object type
 */
export function getFileExtensionForType(objectType: AbapObjectType): string {
    switch (objectType) {
        case 'CLAS':
            return ABAP_FILE_EXTENSIONS.CLASS;
        case 'INTF':
            return ABAP_FILE_EXTENSIONS.INTERFACE;
        case 'PROG':
            return ABAP_FILE_EXTENSIONS.PROGRAM;
        case 'FUGR':
            return ABAP_FILE_EXTENSIONS.FUNCTION_GROUP;
        case 'DDLS':
            return ABAP_FILE_EXTENSIONS.CDS_DDL;
        case 'DCLS':
            return ABAP_FILE_EXTENSIONS.CDS_DCL;
        case 'DDLX':
            return ABAP_FILE_EXTENSIONS.CDS_METADATA_EXT;
        case 'BDEF':
            return ABAP_FILE_EXTENSIONS.BEHAVIOR_DEF;
        default:
            return ABAP_FILE_EXTENSIONS.ABAP;
    }
}

/**
 * Build object file name with correct extension based on object type
 */
export function buildObjectFileName(objectName: string, objectType: AbapObjectType): string {
    const extension = getFileExtensionForType(objectType);
    return `${objectName}${extension}`;
}

/**
 * Extract object name from file name (strips any known ABAP extension)
 */
export function extractObjectNameFromFile(filePath: string): string {
    const fileName = path.basename(filePath);

    // Try to match against known extensions (longest first to handle double extensions)
    const extensions = Object.values(ABAP_FILE_EXTENSIONS).sort((a, b) => b.length - a.length);

    for (const ext of extensions) {
        if (fileName.toLowerCase().endsWith(ext.toLowerCase())) {
            return fileName.substring(0, fileName.length - ext.length).toUpperCase();
        }
    }

    // Fallback: no extension found
    return fileName.toUpperCase();
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
            zObjectName: upperClassName.substring(0, ABAP_CLASS_NAME_MAX_LENGTH),
            wasConverted: false,
            wasTruncated: upperClassName.length > ABAP_CLASS_NAME_MAX_LENGTH,
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
        zObjectName: zClassName,
        wasConverted: true,
        wasTruncated,
    };
}

/**
 * Convert standard SAP CDS view names to Z-prefixed versions
 * Examples: I_Material → ZI_Material, C_SalesOrder → ZC_SalesOrder
 * Preserves suffixes like TP, VH, etc.
 * Ensures name stays within ABAP's 30-character limit
 */
export function convertToZCDSViewName(viewName: string): ObjectNameConversionResult {
    const upperViewName = viewName.toUpperCase();

    // Check if already Z or Y prefixed
    if (upperViewName.startsWith('Z') || upperViewName.startsWith('Y')) {
        return {
            zObjectName: upperViewName.substring(0, ABAP_CLASS_NAME_MAX_LENGTH),
            wasConverted: false,
            wasTruncated: upperViewName.length > ABAP_CLASS_NAME_MAX_LENGTH,
        };
    }

    // Detect CDS view prefixes: I_, C_, A_, R_, P_, E_ (single letter + underscore)
    const prefixMatch = upperViewName.match(/^([A-Z])_(.+)$/);

    let zViewName: string;
    if (prefixMatch) {
        // Has CDS prefix like I_, C_, A_, R_, etc.
        const prefix = prefixMatch[1];
        const rest = prefixMatch[2];
        zViewName = `Z${prefix}_${rest}`;
    } else {
        // No standard prefix, just add Z_
        zViewName = `Z_${upperViewName}`;
    }

    // Truncate to 30 characters if needed
    const wasTruncated = zViewName.length > ABAP_CLASS_NAME_MAX_LENGTH;
    if (wasTruncated) {
        zViewName = zViewName.substring(0, ABAP_CLASS_NAME_MAX_LENGTH);
    }

    return {
        zObjectName: zViewName,
        wasConverted: true,
        wasTruncated,
    };
}

/**
 * Convert SQL view name (used in @AbapCatalog.sqlViewName annotation)
 * SQL view names are limited to 16 characters
 * Examples: IMATERIAL → ZIMATERIAL, ISALESORDER → ZISALORDER (truncated)
 */
export function convertToZSQLViewName(sqlViewName: string): ObjectNameConversionResult {
    const upperSQLViewName = sqlViewName.toUpperCase();

    // Check if already Z or Y prefixed
    if (upperSQLViewName.startsWith('Z') || upperSQLViewName.startsWith('Y')) {
        return {
            zObjectName: upperSQLViewName.substring(0, ABAP_SQL_VIEW_NAME_MAX_LENGTH),
            wasConverted: false,
            wasTruncated: upperSQLViewName.length > ABAP_SQL_VIEW_NAME_MAX_LENGTH,
        };
    }

    // Add Z prefix
    let zSQLViewName = `Z${upperSQLViewName}`;

    // Truncate to 16 characters if needed (aggressive for SQL views)
    const wasTruncated = zSQLViewName.length > ABAP_SQL_VIEW_NAME_MAX_LENGTH;
    if (wasTruncated) {
        zSQLViewName = zSQLViewName.substring(0, ABAP_SQL_VIEW_NAME_MAX_LENGTH);
    }

    return {
        zObjectName: zSQLViewName,
        wasConverted: true,
        wasTruncated,
    };
}

/**
 * Generic object name converter based on object type
 */
export function convertToZObjectName(
    objectName: string,
    objectType: AbapObjectType
): ObjectNameConversionResult {
    switch (objectType) {
        case 'CLAS':
        case 'INTF':
        case 'PROG':
        case 'FUGR':
            return convertToZClassName(objectName);

        case 'DDLS':
        case 'DCLS':
        case 'DDLX':
        case 'BDEF':
            return convertToZCDSViewName(objectName);

        default:
            return convertToZClassName(objectName);
    }
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
            modified: stats.mtime.toISOString(),
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
        throw new McpError(ErrorCode.InternalError, `Failed to read file ${filePath}: ${error.message}`);
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
 * @deprecated Use extractObjectNameFromFile instead
 */
export function extractClassNameFromFile(filePath: string): string {
    return extractObjectNameFromFile(filePath);
}

/**
 * Write ABAP source file to tmp folder
 * @deprecated Use writeObjectSourceFile with object type for proper file extension
 */
export function writeAbapSourceFile(
    className: string,
    sourceCode: string
): { filePath: string; metadata: FileMetadata } {
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

/**
 * Write ABAP object source file to tmp folder with proper extension
 */
export function writeObjectSourceFile(
    objectName: string,
    objectType: AbapObjectType,
    sourceCode: string
): { filePath: string; metadata: FileMetadata } {
    try {
        ensureTmpDir();

        const fileName = buildObjectFileName(objectName, objectType);
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
            `Failed to write ${objectType} source file for ${objectName}: ${error.message}`
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
        throw new McpError(ErrorCode.InvalidParams, 'Class name must start with Z or Y for local development');
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
