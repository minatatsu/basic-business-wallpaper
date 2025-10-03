export interface FormData {
  last_name_jp: string;
  first_name_jp: string;
  last_name_en: string;
  first_name_en: string;
  department_1: string;
  department_2: string;
  group: string;
  role: string;
  selected_templates: string[];
}

export interface Template {
  id: string;
  name: string;
  displayName: string;
  description: string;
  nodeId: string;
}

export const TEMPLATES: Template[] = [
  {
    id: "basic",
    name: "basic",
    displayName: "Basic",
    description: "シンプルな背景",
    nodeId: "41-6091",
  },
  {
    id: "oudan",
    name: "oudan",
    displayName: "横断",
    description: "横断プロジェクト用",
    nodeId: "58-6635",
  },
  {
    id: "run",
    name: "run",
    displayName: "run",
    description: "run事業部用",
    nodeId: "95-818",
  },
  {
    id: "ferretall",
    name: "ferretall",
    displayName: "ferret",
    description: "ferret全般",
    nodeId: "439-5172",
  },
  {
    id: "ferretone",
    name: "ferretone",
    displayName: "ferretOne",
    description: "ferretOne用",
    nodeId: "95-878",
  },
  {
    id: "ferretSOL",
    name: "ferretSOL",
    displayName: "ferretSOL",
    description: "ferretSOL用",
    nodeId: "95-933",
  },
  {
    id: "ferretMedia",
    name: "ferretMedia",
    displayName: "ferretMedia",
    description: "ferretMedia用",
    nodeId: "95-997",
  },
];

export const FIGMA_CONFIG = {
  fileKey: "Tz8aQ9p4SrqCtVT4UEeNa1",
};

// Frame layout information from Figma
export interface FrameLayoutInfo {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  layoutMode: "NONE" | "HORIZONTAL" | "VERTICAL";
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  primaryAxisSizingMode?: string; // FIXED, AUTO
  counterAxisSizingMode?: string; // FIXED, AUTO
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  layoutPositioning?: string; // ABSOLUTE, AUTO
  layoutAlign?: string; // MIN, CENTER, MAX, STRETCH
  layoutGrow?: number;
  constraints?: {
    horizontal: string; // LEFT, RIGHT, CENTER, LEFT_RIGHT, SCALE
    vertical: string; // TOP, BOTTOM, CENTER, TOP_BOTTOM, SCALE
  };
  effects?: any[]; // Drop shadows and other effects
  fills?: any[]; // Background fills
  children: string[]; // IDs of child text elements
  childFrames?: string[]; // IDs of child frames
}

// Text layer information from Figma
export interface TextLayerInfo {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  textAlignHorizontal: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";
  textAlignVertical: "TOP" | "CENTER" | "BOTTOM";
  fills: any[];
  lineHeight: any;
  effects?: any[]; // Drop shadows and other effects
  // Layout information (for auto-layout support)
  layoutGrow?: number;
  layoutAlign?: string;
  layoutPositioning?: string; // ABSOLUTE, AUTO
  constraints?: {
    horizontal: string; // LEFT, RIGHT, CENTER, LEFT_RIGHT, SCALE
    vertical: string; // TOP, BOTTOM, CENTER, TOP_BOTTOM, SCALE
  };
  parentId?: string;
}

// Template data including image URL and text layer positions
export interface TemplateData {
  imageUrl: string;
  textLayers: Record<string, TextLayerInfo>;
  frames: Record<string, FrameLayoutInfo>;
  width: number;
  height: number;
}
