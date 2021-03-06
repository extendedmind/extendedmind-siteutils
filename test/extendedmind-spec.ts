import { expect } from "chai";
import { PublicHeaders, PublicItems, Info,
         Utils } from "../src/index";

describe("extendedmind-siteutils", () => {

  let utils: Utils;

  beforeEach(function() {
    utils = new Utils("http://localhost:3004", {syncTimeTreshold: 0});
  });

  it("should return info", async function() {
    const info: Info = await utils.getInfo();
    expect(info.version).to.not.be.undefined;
    expect(info.build).to.not.be.undefined;
    expect(info.commonCollective[1]).to.equal("test data");
    expect(info.clients).to.be.undefined;

    const latestInfo: Info = await utils.getInfo(true);
    expect(latestInfo.clients.length).to.equal(2);
    expect(latestInfo.clients.filter(client => client.platform === "darwin").length).to.equal(1);

    const latestHistoryInfo: Info = await utils.getInfo(true, true);
    expect(latestHistoryInfo.clients.length).to.equal(3);
    expect(latestHistoryInfo.clients.filter(client => client.platform === "darwin").length).to.equal(2);
  });

  it("should return public headers and update them accordingly", async function() {
    const filters = [{"type": "blacklisted"}];
    const headers: PublicHeaders = await utils.getPublicHeaders();
    const originalNotes = headers.getNotes();
    const originalTags = headers.getTags();
    expect(originalNotes.length).to.equal(26);
    expect(originalTags.length).to.equal(5);
    const productivityTag = originalTags.find(tag => tag.title === "productivity");
    expect(productivityTag.parentTitle).to.equal("work");
    const opinionTagUUID = originalTags.find(tag => tag.title === "opinion").uuid;
    const originalNoteUuid = originalNotes.find(note => note.title === "notes on productivity").uuid;
    const originalFilteredNotes = headers.getNotes(filters);
    expect(originalFilteredNotes.length).to.equal(26);

    // Get modified response, which unpublishes one note, changes the title of another,
    // and changes also common tag to new one, thus productivity=>work combination disappears,
    // which results in 5+1-2 = 4 tags
    const updatedHeaders = await utils.getPublicHeaders();
    const updatedNotes = updatedHeaders.getNotes();
    const updatedTags = updatedHeaders.getTags();
    const updatedProdNote = updatedNotes.find(note => note.uuid === originalNoteUuid);
    expect(updatedProdNote.title).to.equal("updated notes on productivity");
    expect(updatedNotes.length).to.equal(25);
    expect(updatedTags.length).to.equal(4);
    expect(updatedTags.find(updatedTag => updatedTag.uuid === opinionTagUUID)).to.be.undefined;
    expect(updatedTags.find(updatedTag => updatedTag.title === "life")).to.not.be.undefined;
    const updatedFilteredNotes = headers.getNotes(filters);
    expect(updatedFilteredNotes.length).to.equal(24);

    // Validate assignee
    const author = updatedNotes.find(note => note.path === "authored-note").assignee;
    expect(author.handle).to.equal("timo");
  });

  it("should return public items for timo and update them accordingly", async function() {
    const items: PublicItems = await utils.getPublicItems("timo");
    const originalNotes = items.getNotes();
    const originalTags = items.getTags();
    expect(originalNotes.length).to.equal(2);
    const timoUser = items.getOwner();
    expect(originalTags.length).to.equal(3);
    const productivityTag = originalTags.find(tag => tag.title === "productivity");
    expect(productivityTag.parentTitle).to.equal("work");
    const originalNoteUuid = originalNotes.find(note => note.title === "notes on productivity").uuid;
    expect(timoUser.type).to.equal("user");
    expect(timoUser.displayName).to.equal("Timo");
    expect(timoUser.ui.sharing).to.be.true;

    // Get modified response, which unpublishes one note and changes the title of another
    const updatedItems = await utils.getPublicItems("timo");
    const updatedNotes = updatedItems.getNotes();
    const updatedTags = updatedItems.getTags();
    const updatedTimoUser = items.getOwner();
    const updatedProdNote = updatedNotes.find(note => note.uuid === originalNoteUuid);
    expect(updatedProdNote.title).to.equal("updated notes on productivity");
    expect(updatedNotes.length).to.equal(2);
    expect(updatedTags.length).to.equal(2);
    expect(updatedTags.find(updatedTag => updatedTag.uuid === productivityTag.uuid)).to.be.undefined;
    expect(updatedTags.find(updatedTag => updatedTag.title === "work")).to.not.be.undefined;
    expect(updatedTimoUser.type).to.equal("user")
    expect(updatedTimoUser.displayName).to.equal("Timo")
  });

  it("should return public items for lauri and update them accordingly", async function() {
    const items: PublicItems = await utils.getPublicItems("lauri");
    const originalNotes = items.getNotes();
    const originalTags = items.getTags();
    expect(originalNotes.length).to.equal(20);
    expect(originalTags.length).to.equal(2);

    // Get modified response, which gives an empty response, nothing should changes
    const updatedItems = await utils.getPublicItems("lauri");
    const updatedNotes = updatedItems.getNotes();
    const updatedTags = updatedItems.getTags();
    expect(updatedNotes.length).to.equal(20);
    expect(updatedTags.length).to.equal(2);
  });

  it("should return one note for JP who is blacklisted", async function() {
    const items: PublicItems = await utils.getPublicItems("jp");
    const allNotes = items.getNotes();
    const tags = items.getTags();
    expect(allNotes.length).to.equal(1);
    expect(tags.length).to.equal(0);
    const owner = items.getOwner();
    expect(owner.blacklisted).to.not.be.undefined;

    // Get modified response, which gives an empty response, nothing should changes
    const updatedItems = await utils.getPublicItems("jp");
    const updatedNotes = updatedItems.getNotes();
    expect(updatedNotes.length).to.equal(1);
    const updatedOwner = items.getOwner();
    expect(updatedOwner.blacklisted).to.not.be.undefined;

  });

  it("should return notes, some of them that are authored notes for Test Company", async function() {
    const items: PublicItems = await utils.getPublicItems("tc");
    const allNotes = items.getNotes();
    const tags = items.getTags();
    expect(allNotes.length).to.equal(3);
    expect(tags.length).to.equal(1);
    const owner = items.getOwner();
    expect(owner.blacklisted).to.be.undefined;
    const timoAuthoredNote = allNotes.find(note => note.title === "note authored by timo");
    expect(timoAuthoredNote.assignee.handle).to.equal("timo");

    // Get modified response, which gives an empty response, nothing should changes
    const updatedItems = await utils.getPublicItems("tc");
    const updatedNotes = updatedItems.getNotes();
    const updatedTags = updatedItems.getTags();
    expect(updatedNotes.length).to.equal(3);
    expect(updatedTags.length).to.equal(1);

  });

  it("should return a preview note", async function() {
    const previewItem = await utils.getPreviewItem(
      "55449eb6-2fb3-41d5-b806-b4e3be5692cc",
      "c876628e-1d67-411a-84f9-5dfedbed8872",
      1);
    expect(previewItem.keywords.length).to.equal(2);
    const previewItemKeywordWithParent = previewItem.keywords.find(keyword => keyword.parent !== undefined);
    expect(previewItemKeywordWithParent.parentTitle).to.equal("work");
    expect(previewItem.owner.type).to.equal("user");
  });

  it("should get a short id response", async function() {
    const timoShortId = await utils.getShortId("1");
    expect(timoShortId.handle).to.equal("timo");
    expect(timoShortId.path).to.be.undefined;
    const productivityShortId = await utils.getShortId("421");
    expect(productivityShortId.handle).to.equal("timo");
    expect(productivityShortId.path).to.equal("productivity");

    // Get items again, this should cause cache to start working
    await utils.getPublicItems("timo");
    const cachedTimoShortId = await utils.getShortId("1");
    expect(cachedTimoShortId.handle).to.equal("timo");
    expect(cachedTimoShortId.path).to.be.undefined;
    const cachedProductivityShortId = await utils.getShortId("421");
    expect(cachedProductivityShortId.handle).to.equal("timo");
    expect(cachedProductivityShortId.path).to.equal("productivity");


  });

});
