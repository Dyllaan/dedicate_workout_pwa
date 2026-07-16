declare module "react-muscle-highlighter" {
  import type { ComponentType } from "react";

  export type ExtendedBodyPart = {
    slug?: string;
    color?: string;
    intensity?: number;
  };

  export type BodyProps = {
    data?: ExtendedBodyPart[];
    side?: "front" | "back";
    gender?: "male" | "female";
    scale?: number;
    colors?: string[];
    defaultFill?: string;
    defaultStroke?: string;
    border?: string;
    onBodyPartPress?: (part: ExtendedBodyPart) => void;
  };

  const Body: ComponentType<BodyProps>;

  export default Body;
}
