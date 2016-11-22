export class PublicBase {
  protected modified: number;
  protected synced: number;
  protected tags: Array<any>;
  protected notes: Array<any>;

  constructor() {
    this.updateSynced();
  }

  // PUBLIC

  public getLatestModified() {
    return this.modified;
  }

  public getLastSynced() {
    return this.synced;
  }

  public getNotes(filters?: Array<any>): Array<any> {
    if (filters && filters.length && this.notes.length) {
      // Start with a full copy of the notes array
      let filteredNotes = this.notes.slice();
      for (let i = 0; i < filters.length; i++) {
        if (filters[i].type === "index") {
          if (filters[i].start > this.notes.length - 1 || filters[i].max === 0) {
            // The index is bigger than the size of the array, or only zero notes are requested,
            // just return an empty array
            return [];
          }else {
            let endIndex = filters[i].max ? filters[i].start + filters[i].max : undefined;
            filteredNotes = filteredNotes.slice(filters[i].start, endIndex);
          }
        }else if (filters[i].type === "keyword") {
          if (filters[i].include) {
            // Only include notes with the given keyword
            for (let j = filteredNotes.length - 1; j >= 0; j--) {
              let keywordFound = false;
              if (filteredNotes[j].keywords && filteredNotes[j].keywords.length) {
                for (let k = 0; k < filteredNotes[j].keywords.length; k++) {
                  if (filteredNotes[j].keywords[k].title === filters[i].include) {
                    keywordFound = true;
                    break;
                  }else if (filteredNotes[j].keywords[k].parent) {
                    // The tag has a parent, see if the include filter hits that
                    let parentTag = this.getTagByUUID(filteredNotes[j].keywords[k].parent);
                    if (parentTag && parentTag.title === filters[i].include) {
                      keywordFound = true;
                    }
                  }
                }
              }
              if (!keywordFound) filteredNotes.splice(j, 1);
            }
          }
        }
      }
      return filteredNotes;
    }else {
      return this.notes;
    }
  }

  public getTags(): Array<any> {
    return this.tags;
  }

  // PROTECTED

  protected updateSynced() {
    this.synced = Date.now();
  }

  protected updateLatestModified(modified: number) {
    if (modified && (!this.modified || this.modified < modified)) this.modified = modified;
  }

  protected pruneMissingKeywords(staleKeywords: Array<any>) {
    if (staleKeywords.length) {
      for (let i = 0; i < staleKeywords.length; i++) {
        let keywordInUse = false;
        for (let j = 0; j < this.notes.length; j++) {
          if (this.notes[j].keywords && this.notes[j].keywords.indexOf(staleKeywords[i]) !== -1) {
            keywordInUse = true;
            break;
          }
        }
        if (!keywordInUse) {
          let keywordIndex = this.tags.indexOf(staleKeywords[i]);
          if (keywordIndex !== -1) {
            this.tags.splice(keywordIndex, 1);
          }
        }
      }
    }
  }

  protected addTagsToNote(note: any, tags: Array<any>, owner?: string) {
    if (tags) {
      if (!note.keywords) note.keywords = [];
      for (let i = 0; i < tags.length; i++) {
        for (let j = 0; j < this.tags.length; j++) {
          if (this.tags[j].uuid === tags[i] &&
              (!owner || owner === this.tags[j].collectiveOwner)) {
            note.keywords.push(this.tags[j]);
            break;
          }
        }
      }
    }
    return note;
  }

  protected updateNote(note: any, updateNoteFieldsFn: (oldNote: any, newNote: any) => void) {
    if (!this.notes) this.notes = [];
    this.updateLatestModified(note.modified);
    for (let i = 0; i < this.notes.length; i++) {
      if (this.notes[i].uuid === note.uuid) {
        let oldKeywords = [...this.notes[i].keywords];
        let newKeywords = [...note.keywords];
        // Replace value with new value
        updateNoteFieldsFn(this.notes[i], note);
        if (newKeywords && oldKeywords) {
          // Return those keywords that might no longer be needed
          return oldKeywords.filter(oldKeyword => {
            return !newKeywords.find(newKeyword => newKeyword.uuid === oldKeyword.uuid);
          });
        }
      }
    }
    if (!note.deleted) this.notes.push(note);
  }

  protected updateTag(tag: any) {
    if (!this.tags) this.tags = [];
    this.updateLatestModified(tag.modified);
    for (let i = 0; i < this.tags.length; i++) {
      if (this.tags[i].uuid === tag.uuid) {
        this.tags[i] = tag;
        return this.tags[i];
      }
    }
    this.tags.push(tag);
    return tag;
  }

  protected getTagByUUID(uuid: string) {
    if (this.tags) {
      for (let i = 0; i < this.tags.length; i++) {
        if (this.tags[i].uuid === uuid) {
          return this.tags[i];
        }
      }
    }
  }
}

export class PublicHeaders extends PublicBase {
  private owners: Array<any>;

  // Constructor

  constructor(publicResponse: any) {
    super();
    this.addOwners(publicResponse.users, publicResponse.collectives, publicResponse.commonTags);
  }

  // Public

  public updateHeaders(publicResponse: any) {
    this.addOwners(publicResponse.users, publicResponse.collectives, publicResponse.commonTags);
    this.updateSynced();
  }

  // PRIVATE

  private addOwners(users?: Array<any>, collectives?: Array<any>, commonTags?: Array<any>) {
    if (commonTags) {
      for (let i = 0; i < commonTags.length; i++) {
        this.updateTag(commonTags[i]);
      }
    }
    if (users) {
      users.forEach(user => this.addOwner(user, "user"));
    }
    if (collectives) {
      collectives.forEach(collective => this.addOwner(collective, "collective"));
    }
  }

  private addOwner(owner: any, ownerType: string) {

    // First add to owner array
    let ownerToAdd = {
      handle: owner.handle,
      displayName: owner.displayName,
      ownerType: ownerType,
      blacklisted: owner.blacklisted,
    };

    if (ownerToAdd.blacklisted)
      this.updateLatestModified(ownerToAdd.blacklisted);

    if (!this.owners) {
      this.owners = [ownerToAdd];
    } else {
      let existingOwner = this.owners.find(existingOwner => owner.handle === existingOwner.handle);
      if (existingOwner) {
        // Update display name and blacklist status
        existingOwner.displayName = ownerToAdd.displayName;
        existingOwner.blacklisted = ownerToAdd.blacklisted;
        // Make sure we reference the item that is in the array already
        ownerToAdd = existingOwner;
      }else {
        this.owners.push(ownerToAdd);
      }
    }

    // Add notes
    let staleKeywords = [];
    if (owner.notes) {
      for (let i = 0; i < owner.notes.length; i++) {
        let noteWithLatestValues = this.addTagsToNote(owner.notes[i], owner.notes[i].commonTags);
        noteWithLatestValues.owner = ownerToAdd;
        let staleKeywordsInNote = this.updateNote(noteWithLatestValues, this.updateNoteFields);
        if (staleKeywordsInNote) staleKeywords.push.apply(staleKeywords, staleKeywordsInNote);
      }
    }
    if (owner.unpublished && this.notes) {
      for (let i = this.notes.length - 1; i >= 0; i--) {
        if (owner.unpublished.indexOf(this.notes[i].uuid) >= 0) {
          if (this.notes[i].keywords) staleKeywords.push.apply(staleKeywords, this.notes[i].keywords);
          this.notes.splice(i, 1);
        }
      }
    }

    // Sort notes in descending order based on the published timestamp
    if (this.notes && this.notes.length > 1) {
      this.notes.sort(function(note1, note2){
        return note2.published - note1.published;
      });
    }

    // Prune keywords that might be unneeded
    this.pruneMissingKeywords(staleKeywords);
  }

  private updateNoteFields(oldNote: any, newNote: any) {
    oldNote.title = newNote.title;
    oldNote.path = newNote.path;
    oldNote.licence = newNote.licence;
    oldNote.owner = newNote.owner;
    oldNote.keywords = newNote.keywords;
    oldNote.modified = newNote.modified;
    oldNote.published = newNote.published;
  }
}

export class PublicItems extends PublicBase {

  private displayName: string;
  private ownerType: string;
  private format: string;
  private content: any;
  private blacklisted?: number;

  // Constructor

  constructor(itemsResponse: any) {
    super();
    this.displayName = itemsResponse.displayName;
    this.ownerType = itemsResponse.ownerType;
    this.format = itemsResponse.format;
    this.content = itemsResponse.content;
    this.blacklisted = itemsResponse.blacklisted;
    this.updateLatestModified(itemsResponse.modified);
    this.addItems(itemsResponse.notes, itemsResponse.tags, itemsResponse.collectiveTags, itemsResponse.unpublished);
  }

  // Public

  public updateItems(itemsResponse: any) {
    if (itemsResponse.modified) this.updateLatestModified(itemsResponse.modified);
    if (itemsResponse.displayName) this.displayName = itemsResponse.displayName;
    if (itemsResponse.ownerType) this.ownerType = itemsResponse.ownerType;
    if (itemsResponse.format) this.format = itemsResponse.format;
    if (itemsResponse.content) this.content = itemsResponse.content;
    if (itemsResponse.blacklisted) {
      this.blacklisted = itemsResponse.blacklisted;
    } else if (this.blacklisted) {
      this.blacklisted = undefined;
    }
    this.addItems(itemsResponse.notes, itemsResponse.tags, itemsResponse.collectiveTags, itemsResponse.unpublished);
    this.synced = Date.now();
  }

  public getNote(path: string) {
    if (this.notes && this.notes.length) {
      for (let i = 0; i < this.notes.length; i++) {
        if (this.notes[i].visibility.path === path)
          return this.notes[i];
      }
    }
  }

  public addKeywordsToExternalNote(note: any) {
    this.addTagsToNote(note,
      note.relationships && note.relationships.tags ? note.relationships.tags : undefined);
    if (note.keywords && note.keywords.length) {
      let parentKeywords = [];
      for (let i = 0; i < note.keywords.length; i++) {
        if (note.keywords[i].parent) {
          let parentTag = this.getTagByUUID(note.keywords[i].parent);
          if (parentTag && parentKeywords.indexOf(parentTag) === -1) {
            parentKeywords.push(parentTag);
          }
        }
      }
      if (parentKeywords.length)
        note.keywords = note.keywords.concat(parentKeywords);
    }
    return note;
  }

  public getOwner(): any {
    return {
      displayName: this.displayName,
      ownerType: this.ownerType,
      blacklisted: this.blacklisted,
      content: this.content,
      format: this.format,
    };
  }

  // Private

  private addItems(notes?: Array<any>, tags?: Array<any>,
                   collectiveTags?: Array<Array<any>>, unpublished?: Array<any>) {

    let staleKeywords = [];
    if (tags) {
      for (let i = 0; i < tags.length; i++) {
        this.updateTag(tags[i]);
      }
    }
    if (collectiveTags) {
      for (let i = 0; i < collectiveTags.length; i++) {
        for (let j = 0; j < collectiveTags[i][1].length; j++) {
          collectiveTags[i][1][j].collectiveOwner = collectiveTags[i][0];
          this.updateTag(collectiveTags[i][1][j]);
        }
      }
    }

    if (notes) {
      for (let i = 0; i < notes.length; i++) {
        let noteToUpdate = notes[i];
        if (noteToUpdate.relationships) {
          this.addTagsToNote(noteToUpdate, noteToUpdate.relationships.tags);
          if (noteToUpdate.relationships && noteToUpdate.relationships.collectiveTags) {
            let ct = noteToUpdate.relationships.collectiveTags;
            for (let j = 0; j < ct.length; j++) {
              noteToUpdate = this.addTagsToNote(noteToUpdate, ct[j][1], ct[j][0]);
            }
          }
          delete noteToUpdate.relationships;
        }
        let staleKeywordsInNote = this.updateNote(noteToUpdate, this.updateNoteFields);
        if (staleKeywordsInNote) staleKeywords.push.apply(staleKeywords, staleKeywordsInNote);
      }
    }
    if (unpublished && this.notes) {
      for (let i = this.notes.length - 1; i >= 0; i--) {
        if (unpublished.indexOf(this.notes[i].uuid) >= 0) {
          if (this.notes[i].keywords) staleKeywords.push.apply(staleKeywords, this.notes[i].keywords);
          this.notes.splice(i, 1);
        }
      }
    }

    // Sort notes in descending order based on the published timestamp
    if (this.notes && this.notes.length > 1) {
      this.notes.sort(function(note1, note2){
        return note2.visibility.published - note1.visibility.published;
      });
    }

    // Prune keywords that might be unneeded
    this.pruneMissingKeywords(staleKeywords);
  }

  private updateNoteFields(oldNote: any, newNote: any) {
    oldNote.title = newNote.title;
    oldNote.description = newNote.description;
    oldNote.link = newNote.link;
    oldNote.content = newNote.content;
    oldNote.keywords = newNote.keywords;
    oldNote.modified = newNote.modified;
    oldNote.visibility = newNote.visibility;
  }

}