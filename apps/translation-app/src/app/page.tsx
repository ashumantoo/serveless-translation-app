'use client'

import { useState } from "react";
import { ITranslateDBObject, ITranslateRequest, ITranslateResponse } from '@sff/shared-types';

async function getTranslation(args: {
  sourceLang: string,
  targetLang: string,
  text: string
}) {
  try {
    const request: ITranslateRequest = {
      sourceLang: args.sourceLang,
      targetLang: args.targetLang,
      sourceText: args.text
    }
    const result = await fetch("https://kdcth95ixh.execute-api.ap-south-1.amazonaws.com/prod/", {
      method: "POST",
      body: JSON.stringify(request)
    });
    const returnedData = (await result.json()) as ITranslateResponse;
    return returnedData;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function loadPreviousTranslations() {
  try {
    const result = await fetch("https://kdcth95ixh.execute-api.ap-south-1.amazonaws.com/prod/", {
      method: "GET"
    });
    const returnedData = (await result.json()) as Array<ITranslateDBObject>;
    return returnedData;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export default function Home() {
  const [sourceLang, setSourceLang] = useState("");
  const [targetLang, setTargetLang] = useState("");
  const [text, setText] = useState("");
  const [outputText, setOutputText] = useState<null | ITranslateResponse>(null);
  const [previousTranslations, setPreviousTranslations] = useState<ITranslateDBObject[]>([]);
  return (
    <main className="text-center m-6">
      <div className="w-2/4 py-2 mt-4">
        <form onSubmit={async (event) => {
          event.preventDefault();
          const result = await getTranslation({
            sourceLang,
            targetLang,
            text
          });
          if (result) {
            const resultString = JSON.stringify(result);
            const parsedData = JSON.parse(resultString);
            setOutputText(parsedData);
          }
        }}>
          <div className="mb-4 flex flex-col">
            <label htmlFor="sourceLang" className="text-start">Source Language</label>
            <input
              className="bg-gray-200 py-1 mt-2"
              type="text"
              name="sourceLang"
              value={sourceLang}
              onChange={(event) => {
                setSourceLang(event.target.value)
              }}
            />
          </div>
          <div className="mb-4 flex flex-col">
            <label htmlFor="targetLang" className="text-start">Target Language</label>
            <input
              className="bg-gray-200 py-1 mt-2"
              type="text"
              name="targetLang"
              value={targetLang}
              onChange={(event) => {
                setTargetLang(event.target.value)
              }}
            />
          </div>
          <div className="mb-4 flex flex-col">
            <label htmlFor="text" className="text-start">Enter your text</label>
            <textarea
              className="bg-gray-200 py-1 mt-2"
              name="text"
              id="text"
              value={text}
              onChange={(event) => { setText(event.target.value) }}
            >
            </textarea>
          </div>
          <button type="submit" className="w-full py-2 px-4 bg-blue-500 text-white rounded-md uppercase">Translate the text</button>
        </form>
        <div>
          <button
            type="button"
            className="w-full py-2 px-4 bg-emerald-500 text-white rounded-md uppercase mt-4"
            onClick={async () => {
              const data = await loadPreviousTranslations();
              if (data) {
                setPreviousTranslations(data);
              }
            }}
          >
            Load Previous Translations
          </button>
        </div>
        {outputText && <div className="text-start mt-4">
          <p>Translated Text:</p>
          <p>{outputText.outputText}</p>
          <p className="mt-1">Date Time: {new Date(outputText.date).toLocaleString()}</p>
        </div>}
        {previousTranslations && previousTranslations.length > 0 && (
          previousTranslations.map((pt) => {
            return (
              <div className="border border-blue-300 p-2 mt-2" key={pt.requestId}>
                <p>Input Text: {pt.sourceText}</p>
                <p>Translated Text: {pt.outputText}</p>
                <p className="mt-1">Date Time: {new Date(pt.date).toLocaleString()}</p>
              </div>
            )
          })
        )}
      </div>
    </main>
  );
}
