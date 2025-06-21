export type ITranslateRequest = {
  sourceLang: string;
  targetLang: string;
  sourceText: string;
}

export type ITranslateResponse = {
  date: string;
  outputText: string;
}

//& is kind of union operator - type will combination of ITranslateRequest and ITranslateResponse
export type ITranslateDBObject = ITranslateRequest & ITranslateResponse & {
  requestId: string;
}