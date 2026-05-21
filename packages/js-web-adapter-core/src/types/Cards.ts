export interface BaseCard {
  type: string;
}

export interface PHPCard extends BaseCard {
  type: "card";
  fallbackText: string;
  header?: string;
  image?: { url: string; alt: string };
  sections?: CardSection[];
  actions?: CardAction[];
  elements?: CardElement[];
}

export interface CardSection {
  type: "section";
  text?: string;
  fields?: CardField[];
}

export interface CardField {
  title?: string;
  value: string;
}

export interface CardAction {
  type: "button";
  id: string;
  label: string;
  style?: "primary" | "secondary" | "danger";
  value?: string;
  href?: string;
}

export type CardElement =
  | TextElement
  | DividerElement
  | LinkElement
  | TableElement
  | LinkButtonElement
  | ImageElement;

export interface TextElement {
  type: "text";
  content: string;
  style?: "plain" | "bold" | "muted";
}

export interface DividerElement {
  type: "divider";
}

export interface LinkElement {
  type: "link";
  label: string;
  url: string;
}

export interface TableElement {
  type: "table";
  headers: string[];
  rows: string[][];
}

export interface LinkButtonElement {
  type: "link_button";
  label: string;
  url: string;
  style?: "primary" | "secondary" | "danger";
}

export interface ImageElement {
  type: "image";
  url: string;
  alt: string;
}

export interface ImageCard extends BaseCard {
  type: "image";
  url: string;
  alt?: string;
  title?: string;
}

export interface FileCard extends BaseCard {
  type: "file";
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
}

export type Card = PHPCard | ImageCard | FileCard;

export interface CustomCard extends BaseCard {
  type: string;
  [key: string]: unknown;
}
