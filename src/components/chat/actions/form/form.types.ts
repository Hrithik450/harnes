import { z } from "zod";

/**
 * Universal Form Field Types.
 * Designed to scale to 100+ field types (choice, text, textarea, multiselect, slider, etc.)
 */
export const FormFieldTypeSchema = z.enum([
  "choice",
  "text",
  "textarea",
  "multiselect",
]);

export type FormFieldType = z.infer<typeof FormFieldTypeSchema>;

/**
 * Individual field definition within a universal form.
 */
export const FormFieldSchema = z.object({
  id: z.string().min(1),
  type: FormFieldTypeSchema.default("choice"),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).optional(),
  allow_other: z.boolean().optional().default(true),
  placeholder: z.string().optional(),
  required: z.boolean().optional().default(true),
});

export type FormField = z.infer<typeof FormFieldSchema>;

/**
 * Payload expected by the universal form UI action (<ui-action> type: "form").
 */
export const FormPayloadSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  fields: z.array(FormFieldSchema).min(1),
  submit_label: z.string().optional().default("Submit Answers"),
});

export type FormPayload = z.infer<typeof FormPayloadSchema>;

/**
 * State representing user submitted values: maps field id -> answer string or array of strings.
 */
export const FormStateSchema = z.object({
  values: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
});

export type FormState = z.infer<typeof FormStateSchema>;
