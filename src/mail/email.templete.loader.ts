import path from "node:path";
import { mailTempleteConfig } from "../config/mail.templete.config";
import fs from "node:fs";
import ejs from "ejs";
import appConfig from "../config/app.config";

const config = appConfig();

// cache for compiled templates (perfermance boost)
const templeteCache = new Map<string, ejs.TemplateFunction>();

// render EJS email template safely
export function renderEmailTemplate(
    templateName: string,
    context: Record<string, any>
): string {

    let templateFn = templeteCache.get(templateName);
    if (!templateFn) {
        const templatePath = path.join(mailTempleteConfig.templeteDir, templateName);
        if(!fs.existsSync(templatePath)){
            throw new Error(`Template not found: ${templatePath}`);
        }
        const templateContent = fs.readFileSync(templatePath, "utf8");
        templateFn = ejs.compile(templateContent,{
            filename: templatePath,
            cache: true,
        });
        templeteCache.set(templateName, templateFn);
    }

    return templateFn({...context, appName: config.app.name});
}