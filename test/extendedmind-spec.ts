import { expect, should } from "chai";
import { ExtendedMindHeaders, ExtendedMindPublicItems, ExtendedMindUtilsAPI, initializeExtendedMindUtils } from "../src/index";

describe("extendedmind-siteutils", () => {

  let emUtilsAPI: ExtendedMindUtilsAPI;

  beforeEach(function() {
    emUtilsAPI = initializeExtendedMindUtils("http://localhost:3004", {syncTimeTreshold: 0});
  });

  it("should return public headers and update them accordingly", async function() {
    const headers: ExtendedMindHeaders = await emUtilsAPI.getHeaders();
    const originalNotes = headers.getNotes();
    const originalTags = headers.getTags();
    expect(originalNotes.length).to.equal(4);
    expect(originalTags.length).to.equal(4);
    const opinionTagUUID = originalTags.find(tag => tag.title === "opinion").uuid;
    const originalNoteUuid = originalNotes.find(note => note.title === "notes on productivity").uuid;

    // Get modified response, which unpublishes one note, changes the title of another,
    // and changes also common tag to new one, thus productivity=>work combination disappears,
    // which results in 4+1-2 = 3 tags
    const updatedHeaders = await emUtilsAPI.getHeaders();
    const updatedNotes = updatedHeaders.getNotes();
    const updatedTags = updatedHeaders.getTags();
    const updatedProdNote = updatedNotes.find(note => note.uuid === originalNoteUuid);
    expect(updatedProdNote.title).to.equal("updated notes on productivity");
    expect(updatedNotes.length).to.equal(3);
    expect(updatedTags.length).to.equal(3);
    expect(updatedTags.find(updatedTag => updatedTag.uuid === opinionTagUUID)).to.be.undefined;
    expect(updatedTags.find(updatedTag => updatedTag.title === "life")).to.not.be.undefined;
  });

  it("should return public items for timo and update them accordingly", async function() {
    const items: ExtendedMindPublicItems = await emUtilsAPI.getPublicItems("timo");
    const originalNotes = items.getNotes();
    const originalTags = items.getTags();
    expect(originalNotes.length).to.equal(2);
    expect(originalTags.length).to.equal(3);
    const productivityTagUUID = originalTags.find(tag => tag.title === "productivity").uuid;
    const originalNoteUuid = originalNotes.find(note => note.title === "notes on productivity").uuid;

    // Get modified response, which unpublishes one note and changes the title of another
    const updatedItems = await emUtilsAPI.getPublicItems("timo");
    const updatedNotes = updatedItems.getNotes();
    const updatedTags = updatedItems.getTags();
    const updatedProdNote = updatedNotes.find(note => note.uuid === originalNoteUuid);
    expect(updatedProdNote.title).to.equal("updated notes on productivity");
    expect(updatedNotes.length).to.equal(2);
    expect(updatedTags.length).to.equal(2);
    expect(updatedTags.find(updatedTag => updatedTag.uuid === productivityTagUUID)).to.be.undefined;
    expect(updatedTags.find(updatedTag => updatedTag.title === "work")).to.not.be.undefined;
  });



});
