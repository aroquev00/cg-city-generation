export const cityProbs = [
  {
    "type": "Downtown",
    "movementActionRules": [
      {
        "action": "CS",
        "probability": 0.8
      },
      {
        "action": "TR",
        "probability": 0.1
      },
      {
        "action": "TL",
        "probability": 0.1
      },
      {
        "action": "STOP",
        "probability": 0.0
      }
    ],
    "branchOutRules": [
      {
        "action": "doBranchOut",
        "probability": 0.2
      },
      {
        "action": "doNotBranchOut",
        "probability": 0.8
      }
    ],
    "crossIntersectionRules": [
      {
        "action": "doCrossIntersection",
        "probability": 0.5
      },
      {
        "action": "doNotCrossIntersection",
        "probability": 0.5
      }
    ],
    "deadEndRules": [
      {
        "action": "doAllowDeadEnd",
        "probability": 0.0
      },
      {
        "action": "doNotAllowDeadEnd",
        "probability": 1.0
      }
    ]
  }
];