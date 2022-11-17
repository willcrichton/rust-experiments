import { RustAnalyzer } from "@wcrichto/rust-editor";
import introJs from "intro.js";
import React, { useEffect, useRef, useState } from "react";

import { Problem } from "./problem";

const SNIPPET = `
/// Inserts the element 0 into the end of \`v\`.
fn add_zero(v: &Vec<i32>) {
  v.push(0);
}
`.trim();

export let Tutorial = ({
  next,
  ra,
}: {
  next: () => void;
  ra?: RustAnalyzer;
}) => {
  let ref = useRef<HTMLDivElement>(null);
  let [started, setStarted] = useState(false);
  let [step, setStep] = useState(0);
  let [curTour, setCurTour] = useState<introJs.IntroJs | undefined>();

  let makeTour = (steps: introJs.Step[]) => {
    if (curTour) curTour.exit();
    let tour = introJs();
    tour.addSteps(steps);
    tour.setOptions({
      showBullets: false,
      exitOnEsc: false,
      exitOnOverlayClick: false,
      keyboardNavigation: false,
    });
    tour.onafterchange(() => {
      let nextButton = document.querySelector<HTMLAnchorElement>(
        ".introjs-nextbutton"
      );
      if (!nextButton) return;
      nextButton.style.display =
        tour.currentStep() == steps.length - 1 ? "none" : "inline";
    });
    tour.start();

    setCurTour(tour);

    let intvl: NodeJS.Timer;
    setTimeout(() => {
      intvl = setInterval(() => tour.refresh(), 100);
    }, 1000);
    return () => clearInterval(intvl);
  };

  useEffect(() => {
    if (!started) return;

    let parent = ref.current!;
    let part = parent.querySelector(`.part:nth-child(${step + 1})`)!;

    if (step == 0) {
      let editor = part.querySelector(".editor")!;
      let moreInfo = part.querySelector(".more-info")!;
      let steps: introJs.Step[] = [
        {
          element: part,
          intro: `Each problem focuses on a single program. Read the directions on the left, then click "Next".`,
          position: "right",
        },
        {
          element: editor,
          intro: `
          The code viewer includes some IDE features like types and method definitions. Try hovering your mouse over <code>v</code> and <code>push</code>.
          `,
          position: "right",
        },
        {
          element: moreInfo,
          intro: `
          Each question contains additional instructions to clarify the problem. Try clicking on the info button, then click next.
          `,
          position: "right",
        },
        {
          element: part,
          intro: `Try answering the problem. Write your answer in the blank, and click <strong>Submit</strong>.`,
          position: "right",
        },
      ];
      return makeTour(steps);
    } else if (step == 1) {
      let steps: introJs.Step[] = [
        {
          element: part,
          intro:
            "After answering Part 1, you will go to Part 2. You cannot edit your previous answers. Now please read the directions, fill out your answer, and click submit.",
          position: "left",
        },
      ];
      return makeTour(steps);
    } else if (step == 2) {
      let steps: introJs.Step[] = [
        {
          element: part,
          intro:
            "For Part 3, you will be asked to write Rust code. The code viewer is editable, and you should write your answer there. Click submit when you are done.",
          position: "right",
        },
      ];
      return makeTour(steps);
    } else if (step == 3) {
      let outputArea = part.querySelector(".output")!;
      let timer = parent.querySelector(".timer")!;
      let steps: introJs.Step[] = [
        {
          element: part,
          intro:
            "Part 4 will also have you write code. This time, you may use the standard library documentation. Read the directions, then click next.",
          position: "left",
        },
        {
          element: outputArea,
          intro:
            "As you are editing the code, click Run to see the output of the Rust compiler on your program. Try clicking it now.",
          position: "left",
        },
        {
          element: timer,
          intro:
            "Each task should take no more than 15 minutes. This box will track the time you've spent on each task. The experiment will not force you to the next task, but this box provides a guideline so you don't spend too much time on a task.",
          position: "bottom",
        },
        {
          element: part,
          intro:
            "That's all for the tutorial! Try fixing this function. Once you hit submit, we will go to the main experiment.",
          position: "left",
        },
      ];
      return makeTour(steps);
    }
  }, [started, step]);

  return (
    <div ref={ref}>
      <p>
        First, we're going to walk through a sample problem. Click this button
        to get started:
      </p>
      <p>
        <button onClick={() => setStarted(true)}>Start Tutorial</button>
      </p>
      {started ? (
        <Problem
          snippet={SNIPPET}
          next={next}
          ra={ra}
          onStep={step => {
            if (step == 4) curTour!.exit();
            setStep(step);
          }}
        />
      ) : null}
    </div>
  );
};
