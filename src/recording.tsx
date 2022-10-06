import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";
import windowShareUrl from "./assets/window-share.png";

let VideoPreview = ({ stream }: { stream: MediaStream }) => {
  let ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    ref.current!.srcObject = stream;
  }, []);
  return <video width={300} height={300} autoPlay ref={ref} />;
};

let AudioPreview = ({ stream }: { stream: MediaStream }) => {
  let visualizer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    (async () => {
      let ctx = new AudioContext();
      let src = ctx.createMediaStreamSource(stream);
      await ctx.audioWorklet.addModule("vumeter-worklet.js");
      let node = new AudioWorkletNode(ctx, "vumeter");
      src.connect(node);

      let volumes: number[] = [];
      node.port.onmessage = (event) => {
        volumes.push(event.data.volume);
        if (volumes.length > 10) volumes.shift();
      };

      let stop = false;
      let draw = () => {
        if (stop || !visualizer.current) return;
        requestAnimationFrame(draw);
        let avg = _.mean(volumes);
        let width = Math.min(3000 * avg, 500);
        visualizer.current.style.width = `${width}px`;
      };
      draw();
      return () => {
        stop = true;
      };
    })();
  }, []);
  return (
    <div>
      <div className="audio-visualizer">
        <div className="bar" ref={visualizer} />
      </div>
    </div>
  );
};

export let RecordingSetup = ({
  next,
  registerRecorder,
}: {
  next: () => void;
  registerRecorder: (recorder: MediaRecorder) => void;
}) => {
  let [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  let [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  let initVideo = async () => {
    try {
      setVideoStream(
        await navigator.mediaDevices.getDisplayMedia({
          video: true,
        } as any)
      );
    } catch (err) {
      console.error(err);
      return;
    }
  };

  let initAudio = async () => {
    try {
      setAudioStream(
        await navigator.mediaDevices.getUserMedia({
          audio: {
            noiseSuppression: true,
            echoCancellation: true,
          },
        })
      );
    } catch (err) {
      console.error(err);
      return;
    }
  };

  let finish = () => {
    if (!videoStream || !audioStream) throw new Error("Unreachable");

    let audioTrack = audioStream.getTracks()[0];
    videoStream.addTrack(audioTrack);
    audioStream.removeTrack(audioTrack);

    videoStream.getVideoTracks()[0].addEventListener("ended", () => {
      // TODO: handle the case where user cancels recording
    });

    let recorder = new MediaRecorder(videoStream!);
    recorder.start();
    registerRecorder(recorder);
    next();
  };

  useEffect(() => {
    window.scroll({
      left: 0,
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  }, [videoStream, audioStream]);

  return (
    <div className="container">
      <p>
        First, we need to setup the recording. Click the button below to enable
        screen recording, and <strong>select the browser window</strong> (not
        the tab!) to record as shown in the screenshot below.
      </p>
      <div>
        <img
          style={{ width: "500px", border: "1px solid #ccc" }}
          src={windowShareUrl}
        />
      </div>
      <p>
        <button onClick={initVideo}>Enable screen recording</button>
      </p>
      {videoStream ? (
        <>
          <p>
            If that worked correctly, you should see the current web page in the
            streaming video below. If you see a different page, please click the
            button above again.
          </p>
          <VideoPreview stream={videoStream!} />
          <p>Next, click the button below to enable mic recording:</p>
          <p>
            <button onClick={initAudio}>Enable mic recording</button>
          </p>
          {audioStream ? (
            <>
              <p>
                Try speaking into your microphone. If that worked correctly,
                then you should see a green bar going up as you talk.
              </p>
              <AudioPreview stream={audioStream!} />
              <p>
                If both the video and the audio are working, then click here to
                continue:
              </p>
              <button onClick={finish}>Continue</button>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
};

export let Outro = ({ recorder }: { recorder: MediaRecorder }) => {
  useEffect(() => {
    recorder.addEventListener("dataavailable", (e) => {
      if (e.data.size > 0) {
        let mime = e.data.type.split(";")[0];
        console.log("Mime type", mime, e.data.type);
        let exts: { [k: string]: string } = {
          "video/x-matroska": "mkv",
          "video/mp4": "mp4",
        };
        let ext = exts[mime] || "unk";
        let url = URL.createObjectURL(e.data);
        let a = document.createElement("a");
        a.href = url;
        a.download = `recording.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
    recorder.stop();
    recorder.stream.getTracks().forEach((track) => track.stop());
  });
  return (
    <div className="container">
      <p>
        Thank you for your participation in the experiment! We have stopped
        recording your screen and audio.
      </p>
      <p className="warning">TODO: this will send the data to the server</p>
    </div>
  );
};
