import * as path from 'path'
import * as semver from 'semver'

import {z} from 'zod'

export interface ValidationIssue {
  message: string
  path?: string
}

const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const slugRegex = /^([a-z]|-)+$/
const tsFileRegex = /\.ts$/i
const iconFileRegex = /\.(png|jpe?g|gif)$/i

const nonEmptyString = (field: string) =>
  z.string().min(1, `${field} cannot be empty`)

const semverField = (field: string) =>
  z
    .string()
    .min(1, `${field} cannot be empty`)
    .superRefine((value, ctx) => {
      if (!semver.valid(value)) {
        ctx.addIssue(`${field} must be a valid semver version`)
      }
    })

const authorSchema = z
  .object({
    name: nonEmptyString('author.name'),
    support: nonEmptyString('author.support'),
    homepage: z
      .string()
      .min(1, 'author.homepage cannot be empty')
      .url('author.homepage must be a valid URL')
      .optional(),
  })
  .passthrough()

const appJsonSchema = z
  .object({
    id: z.string().regex(uuidV4Regex, 'id must be a valid uuid v4'),
    name: nonEmptyString('name'),
    nameSlug: z
      .string()
      .min(3, 'nameSlug must be at least 3 characters')
      .regex(slugRegex, 'nameSlug can only contain lowercase letters and hyphens'),
    version: semverField('version'),
    description: nonEmptyString('description'),
    requiredApiVersion: semverField('requiredApiVersion'),
    author: authorSchema,
    classFile: z.string().regex(tsFileRegex, 'classFile must be a TypeScript file'),
    iconFile: z.string().regex(iconFileRegex, 'iconFile must be a png, jpg, jpeg, or gif file'),
    assetsFolder: z
      .string()
      .superRefine((value, ctx) => {
        if (value.startsWith('.')) {
          ctx.addIssue('assetsFolder cannot start with a period')
        }
        if (path.normalize(value) !== value) {
          ctx.addIssue('assetsFolder must be a relative folder path')
        }
      })
      .optional(),
  })
  .passthrough()

export const validateAppJson = (info: unknown): Array<ValidationIssue> => {
  const result = appJsonSchema.safeParse(info)

  if (result.success) {
    return []
  }

  return result.error.issues.map((issue) => ({
    message: issue.message,
    path: issue.path.length ? issue.path.map((segment) => String(segment)).join('.') : undefined,
  }))
}
