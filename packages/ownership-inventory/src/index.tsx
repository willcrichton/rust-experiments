import { RustAnalyzer, preloadRaInstances } from "@wcrichto/rust-editor";
import _ from "lodash";
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import * as uuid from "uuid";

import "./index.scss";
import { Demographics, FadeIn, Intro } from "./intro";
import { Answer, Problem, Timed } from "./problem";
import { problems as PROBLEMS } from "./problems.toml";
import { Tutorial } from "./tutorial";

type Stage = "start" | "tutorial" | "problems" | "end";

declare global {
  var COMMIT_HASH: string;
  var SERVER_URL: string;
  var STAGE: Stage | null;
}

type SavedState = "unsaved" | "saved" | "error";

let Outro = ({
  data,
  saved,
}: {
  data: Timed<ExperimentData>;
  saved: SavedState;
}) => {
  let textarea = useRef<HTMLTextAreaElement>(null);
  let [submitted, setSubmitted] = useState(false);
  let submit = () => {
    fetch(`${SERVER_URL}/ownership-inventory-feedback`, {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      mode: "cors",
      body: JSON.stringify({ feedback: textarea.current!.value }),
    });
    setSubmitted(true);
  };

  let DownloadBackup = () => {
    let url = useMemo(() => {
      let blob = new Blob([JSON.stringify(data)], { type: "text/json" });
      return URL.createObjectURL(blob);
    }, []);
    return (
      <FadeIn>
        <p>
          <strong>ERROR:</strong> The data upload to our server failed. As a
          backup, please download this JSON file:
        </p>
        <p>
          <a href={url} download="experiment-data.json">
            Download JSON
          </a>
        </p>
        <p>
          Then attach it in an email to{" "}
          <a href="mailto:wcrichto@brown.edu">wcrichto@brown.edu</a>
        </p>
      </FadeIn>
    );
  };

  return (
    <div className="outro">
      {saved == "unsaved" ? (
        <p>
          <strong>DO NOT CLOSE THIS TAB.</strong> We are uploading the
          experimental data to our server, please wait...
        </p>
      ) : saved == "saved" ? (
        <FadeIn>
          <p>
            Thank you for your participation in the experiment! If you have any
            feedback on the format of the experiment, please let us know:
          </p>
          <textarea
            ref={textarea}
            placeholder="Put your feedback here..."
            disabled={submitted}
          />
          <p>
            <button onClick={submit} disabled={submitted}>
              Submit Feedback
            </button>
            {submitted ? " Feedback received. Thanks!" : null}
          </p>
          <p>
            Otherwise, the experiment has concluded. You may close this tab now.
          </p>
        </FadeIn>
      ) : (
        <DownloadBackup />
      )}
    </div>
  );
};

interface TaggedAnswer {
  question: string;
  answer: Timed<Answer>;
}

interface ExperimentData {
  id: string;
  commitHash: string;
  demo: Demographics;
  answers: TaggedAnswer[];
}

let App = () => {
  // return <>This experiment has concluded and is not accepting more participants at this time.</>;

  // let problems = useMemo(() => _.sampleSize(PROBLEMS, 3), []);
  let problems = useMemo(
    () =>
      _.shuffle(["get_or_default", "concat_all", "reverse", "find_nth"]).map(
        name => _.find(PROBLEMS, { name })!
      ),
    []
  );
  let id = useMemo(() => uuid.v4(), []);
  let start = useMemo(() => new Date().getTime(), []);
  let answers = useMemo<TaggedAnswer[]>(() => [], []);

  let [stage, setStage] = useState<Stage>(STAGE || "start");
  let [problem, setProblem] = useState(0);
  let [demo, setDemo] = useState<Demographics | undefined>();
  let [saved, setSaved] = useState<SavedState>("unsaved");

  useEffect(() => {
    preloadRaInstances(3);
  }, []);

  useEffect(() => {
    if (stage != "start" && stage != "end") {
      window.onbeforeunload = () =>
        "Are you sure you want to exit the experiment before finishing?";
      return () => {
        window.onbeforeunload = null;
      };
    }
  }, [stage]);

  let compileData = (): Timed<ExperimentData> => ({
    id,
    commitHash: COMMIT_HASH,
    answers,
    demo: demo!,
    start,
    end: new Date().getTime(),
  });

  let onSubmitProblem = (answer: Timed<Answer>) => {
    answers.push({
      question: problems[problem].name,
      answer,
    });

    if (answers.length > 0) {
      let promise = fetch(`${SERVER_URL}/ownership-inventory`, {
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
        mode: "cors",
        body: JSON.stringify(compileData()),
      });

      if (answers.length == problems.length) {
        promise.then(() => setSaved("saved")).catch(() => setSaved("error"));
      }
    }

    if (problem == problems.length - 1) setStage("end");
    else setProblem(problem + 1);
  };

  return (
    <>
      <div className="container">
        <h1>
          Rust Experiment: Ownership Inventory{" "}
          {stage == "tutorial" ? (
            <>&mdash; Tutorial</>
          ) : stage == "problems" ? (
            <>
              &mdash; Task {problem + 1} / {problems.length}
            </>
          ) : null}
        </h1>
      </div>
      {stage === "start" ? (
        <Intro
          next={(demo: Demographics) => {
            setDemo(demo);
            setStage("tutorial");
          }}
        />
      ) : stage == "tutorial" ? (
        <Tutorial next={() => setStage("problems")} />
      ) : stage == "problems" ? (
        <Problem
          key={problem}
          snippet={problems[problem].code.trim()}
          next={onSubmitProblem}
        />
      ) : (
        <Outro data={compileData()} saved={saved} />
      )}
    </>
  );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />
);
