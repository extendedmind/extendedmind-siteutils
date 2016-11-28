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
    const timoUser = items.getOwner();
    expect(originalNotes.length).to.equal(2);
    expect(originalTags.length).to.equal(3);
    const productivityTagUUID = originalTags.find(tag => tag.title === "productivity").uuid;
    const originalNoteUuid = originalNotes.find(note => note.title === "notes on productivity").uuid;
    expect(timoUser.type).to.equal("user");
    expect(timoUser.displayName).to.equal("Timo");

    // Get modified response, which unpublishes one note and changes the title of another
    const updatedItems = await utils.getPublicItems("timo");
    const updatedNotes = updatedItems.getNotes();
    const updatedTags = updatedItems.getTags();
    const updatedTimoUser = items.getOwner();
    const updatedProdNote = updatedNotes.find(note => note.uuid === originalNoteUuid);
    expect(updatedProdNote.title).to.equal("updated notes on productivity");
    expect(updatedNotes.length).to.equal(2);
    expect(updatedTags.length).to.equal(2);
    expect(updatedTags.find(updatedTag => updatedTag.uuid === productivityTagUUID)).to.be.undefined;
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

});
