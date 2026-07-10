from __future__ import annotations

import hashlib
import json
from pathlib import Path

import joblib


SOURCE = Path(
    "C:/dev/wellnessbox-rnd/artifacts/tips/interim/retrained/model/"
    "proxy_recommendation_model.joblib"
)
OUTPUT = Path(__file__).resolve().parents[2] / "data" / "tips" / "proxy-recommendation-model.json"


def classifier_payload(classifier: object) -> dict[str, object]:
    return {
        "classes": [int(value) for value in classifier.classes_],
        "coefficients": classifier.coef_.tolist(),
        "intercepts": classifier.intercept_.tolist(),
    }


def main() -> None:
    artifact = joblib.load(SOURCE)
    if artifact.get("mode") != "PROXY_GOLD_SIMULATION":
        raise RuntimeError("unexpected_model_mode")

    ingredient_model = artifact["ingredient_model"]
    payload = {
        "schemaVersion": "2026-07-10.v1",
        "mode": artifact["mode"],
        "sourceArtifact": SOURCE.name,
        "sourceSha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        "seed": artifact["seed"],
        "vocabulary": artifact["vocabulary"],
        "ingredients": artifact["ingredients"],
        "ingredientClassifiers": [
            classifier_payload(estimator) for estimator in ingredient_model.estimators_
        ],
        "countClassifier": classifier_payload(artifact["count_model"]),
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "output": str(OUTPUT),
                "bytes": OUTPUT.stat().st_size,
                "ingredients": len(payload["ingredients"]),
                "features": len(payload["vocabulary"]),
                "sourceSha256": payload["sourceSha256"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
