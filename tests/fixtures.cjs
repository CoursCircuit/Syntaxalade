// Test-only content. This file is never included in the distributed application.
const WM = require("../core.js");
module.exports = function fixture() {
  const d = WM.defaults();
  d.folders = [{ id: "topic", name: "Dossier de test" }];
  d.lists = [
    {
      id: "phrases",
      title: "Liste de test",
      folderId: "topic",
      subject: "Allemand",
      level: "A2",
      favorite: false,
      entries: [
        {
          sentence: "Ich lerne Deutsch.",
          translation: "J’apprends l’allemand.",
        },
        { sentence: "Wir spielen heute.", translation: "" },
        { sentence: "Er liest ein Buch.", translation: "Il lit un livre." },
      ],
    },
  ];
  d.classes = [
    {
      id: "class",
      name: "Classe de test",
      students: ["Alice", "Noé"],
      groups: [
        { id: "team-a", name: "Équipe A", members: ["Alice"], score: 0 },
        { id: "team-b", name: "Équipe B", members: ["Noé"], score: 0 },
      ],
    },
  ];
  d.preferences.listId = "phrases";
  d.preferences.classId = "class";
  d.preferences.order = "sequential";
  return d;
};
