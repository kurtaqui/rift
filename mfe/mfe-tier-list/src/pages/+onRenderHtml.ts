import { createMfeOnRenderHtml } from "@rift/mfe-fragment/renderer";
import { getPageElement } from "vike-react/__internal/integration/getPageElement";
import { onRenderHtml as vikeReactOnRenderHtml } from "vike-react/__internal/integration/onRenderHtml";

export const onRenderHtml = createMfeOnRenderHtml(vikeReactOnRenderHtml, getPageElement);
