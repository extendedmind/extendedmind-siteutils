export class PublicBase {
  protected modified: number;
  protected synced: number;
  protected tags: any[] = [];
  protected notes: any[] = [];

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

  public getNotes(filters?: any[]): any[] {
    if (filters && filters.length && this.notes.length) {
      // Start with a full copy of the notes array
      let filteredNotes = this.notes.slice();
      for (const filter of filters) {
        if (filter.type === "blacklisted") {
          for (let j = filteredNotes.length - 1; j >= 0; j--) {
            if (filteredNotes[j].owner && filteredNotes[j].owner.blacklisted) {
              filteredNotes.splice(j, 1);
            }
          }
        } else if (filter.type === "index") {
          if (filter.start > this.notes.length - 1 || filter.max === 0) {
            // The index is bigger than the size of the array, or only zero notes are requested,
            // just return an empty array
            return [];
          }else {
            const endIndex = filter.max ? filter.start + filter.max : undefined;
            filteredNotes = filteredNotes.slice(filter.start, endIndex);
          }
        } else if (filter.type === "keyword") {
          if (filter.include) {
            // Only include notes with the given keyword
            for (let j = filteredNotes.length - 1; j >= 0; j--) {
              let keywordFound = false;
              if (filteredNotes[j].keywords && filteredNotes[j].keywords.length) {
                for (const filteredNoteKeyword of filteredNotes[j].keywords) {
                  if (filteredNoteKeyword.title === filter.include) {
                    keywordFound = true;
                    break;
                  }else if (filteredNoteKeyword.parent) {
                    // The tag has a parent, see if the include filter hits that
                    const parentTag = this.getTagByUUID(filteredNoteKeyword.parent);
                    if (parentTag && parentTag.title === filter.include) {
                      keywordFound = true;
                      break;
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

  public getTags(): any[] {
    if (this.tags === undefined) return [];
    return this.tags;
  }

  // PROTECTED

  protected updateSynced() {
    this.synced = Date.now();
  }

  protected updateLatestModified(modified: number) {
    if (modified && (!this.modified || this.modified < modified)) this.modified = modified;
  }

  protected pruneMissingKeywords(staleKeywords: any[]) {
    if (staleKeywords.length) {
      for (const staleKeyword of staleKeywords) {
        let keywordInUse = false;
        for (const existingNote of this.notes) {
          if (existingNote.keywords && existingNote.keywords.indexOf(staleKeyword) !== -1) {
            keywordInUse = true;
            break;
          }
        }
        if (!keywordInUse) {
          const keywordIndex = this.tags.indexOf(staleKeyword);
          if (keywordIndex !== -1) {
            this.tags.splice(keywordIndex, 1);
          }
        }
      }
    }
  }

  protected addTagsToNote(note: any, tags: any[], owner?: string) {
    if (tags) {
      if (!note.keywords) note.keywords = [];
      for (const tag of tags) {
        for (const existingTag of this.tags) {
          if (existingTag.uuid === tag &&
              (!owner || owner === existingTag.collectiveOwner)) {
            note.keywords.push(existingTag);
            break;
          }
        }
      }
    }
    return note;
  }

  protected updateNote(note: any, updateNoteFieldsFn: (oldNote: any, newNote: any) => void) {
    this.updateLatestModified(note.modified);
    for (const existingNote of this.notes) {
      if (existingNote.uuid === note.uuid) {
        const oldKeywords = existingNote.keywords ? [...existingNote.keywords] : undefined;
        const newKeywords = note.keywords ? [...note.keywords] : undefined;
        // Replace value with new value
        updateNoteFieldsFn(existingNote, note);
        if (oldKeywords) {
          if (newKeywords) {
            // Return those keywords that might no longer be needed
            return oldKeywords.filter((oldKeyword) => {
              return !newKeywords.find((newKeyword) => newKeyword.uuid === oldKeyword.uuid);
            });
          } else {
            return oldKeywords;
          }
        }
      }
    }
    if (!note.deleted) this.notes.push(note);
  }

  protected updateTag(tag: any) {
    this.updateLatestModified(tag.modified);

    // Handle setting the parentTitle property
    if (tag.parent) {
      // Try to find parent in existing tags
      const parentTag = this.getTagByUUID(tag.parent);
      if (parentTag) {
        tag.parentTitle = parentTag.title;
      }
    }
    // Check if this tag is a parent to other tags and update their title
    for (const existingTag of this.tags) {
      if (existingTag.parent === tag.uuid) {
        existingTag.parentTitle = tag.title;
      }
    }

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
    for (const existingTag of this.tags) {
      if (existingTag.uuid === uuid) {
        return existingTag;
      }
    }
  }
}

export class PublicHeaders extends PublicBase {
  private owners: any[];

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

  private addOwners(users?: any[], collectives?: any[], commonTags?: any[]) {
    if (commonTags) {
      for (const commonTag of commonTags) {
        this.updateTag(commonTag);
      }
    }
    if (users) {
      users.forEach((user) => this.addOwner(user, "user"));
    }
    if (collectives) {
      collectives.forEach((collective) => this.addOwner(collective, "collective"));
    }
  }

  private addOwner(owner: any, ownerType: string) {

    // First add to owner array
    let ownerToAdd = {
      handle: owner.handle,
      displayName: owner.displayName,
      type: ownerType,
      blacklisted: owner.blacklisted,
    };

    if (ownerToAdd.blacklisted)
      this.updateLatestModified(ownerToAdd.blacklisted);

    if (!this.owners) {
      this.owners = [ownerToAdd];
    } else {
      const existingOwner = this.owners.find((o) => owner.handle === o.handle);
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
    const staleKeywords = [];
    if (owner.notes) {
      for (const note of owner.notes) {
        const noteWithLatestValues = this.addTagsToNote(note, note.commonTags);
        noteWithLatestValues.owner = ownerToAdd;
        const staleKeywordsInNote = this.updateNote(noteWithLatestValues, this.updateNoteFields);
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
      this.notes.sort((note1, note2) => {
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
    oldNote.assignee = newNote.assignee;
  }
}

export class PublicItems extends PublicBase {

  private displayName: string;
  private ownerType: string;
  private shortId: any;
  private format?: string;
  private content?: any;
  private blacklisted?: number;
  private ui?: any;
  private ownerModified?: number;
  private ownerProcessed?: any;

  // Constructor

  constructor(private handle: string, itemsResponse: any) {
    super();
    this.ownerModified = itemsResponse.modified;
    this.displayName = itemsResponse.displayName;
    this.ownerType = itemsResponse.ownerType;
    this.format = itemsResponse.format;
    this.content = itemsResponse.content;
    this.shortId = itemsResponse.shortId;
    this.blacklisted = itemsResponse.blacklisted;
    if (itemsResponse.publicUi) this.ui = JSON.parse(itemsResponse.publicUi);
    this.updateLatestModified(itemsResponse.modified);
    this.addItems(itemsResponse.notes, itemsResponse.tags, itemsResponse.collectiveTags,
                  itemsResponse.unpublished, itemsResponse.assignees);
  }

  // Public

  public updateItems(itemsResponse: any) {
    if (itemsResponse.modified) this.updateLatestModified(itemsResponse.modified);
    if (itemsResponse.displayName) this.displayName = itemsResponse.displayName;
    if (itemsResponse.ownerType) this.ownerType = itemsResponse.ownerType;
    if (itemsResponse.format) this.format = itemsResponse.format;
    if (itemsResponse.content) this.content = itemsResponse.content;
    if (itemsResponse.shortId) this.shortId = itemsResponse.shortId;
    if (itemsResponse.blacklisted) {
      this.blacklisted = itemsResponse.blacklisted;
    } else if (this.blacklisted) {
      this.blacklisted = undefined;
    }
    this.addItems(itemsResponse.notes, itemsResponse.tags, itemsResponse.collectiveTags,
                  itemsResponse.unpublished, itemsResponse.assignees);
    this.synced = Date.now();
  }

  public getNote(path: string) {
    if (this.notes && this.notes.length) {
      for (const note of this.notes) {
        if (note.visibility.path === path)
          return note;
      }
    }
  }

  public getOwner(): any {
    return {
      displayName: this.displayName,
      type: this.ownerType,
      blacklisted: this.blacklisted,
      content: this.content,
      format: this.format,
      shortId: this.shortId,
      ui: this.ui,
      modified: this.ownerModified,
      processed: this.ownerProcessed,
    };
  }

  public getShortId(shortId: string): any {
    // Check if shortId matches owner directly
    if (this.shortId === shortId) {
      return {
        handle: this.handle,
      };
    }
    // Check if shortId matches owner directly
    const noteForShortId = this.notes.find((note) => note.visibility && note.visibility.shortId === shortId);
    if (noteForShortId) {
      return {
        handle: this.handle,
        path: noteForShortId.visibility.path,
      };
    }
  }

  public setOwnerProcessed(data: any): any {
    this.ownerProcessed = {
      modified: this.ownerModified,
      data,
    };
  }

  // Private

  private addItems(notes?: any[], tags?: any[],
                   collectiveTags?: any[][], unpublished?: any[],
                   assignees?: any[]) {

    const staleKeywords = [];
    if (tags) {
      for (const tag of tags) {
        this.updateTag(tag);
      }
    }
    if (collectiveTags) {
      for (const collectiveTagInfo of collectiveTags) {
        for (const collectiveTag of collectiveTagInfo[1]) {
          collectiveTag.collectiveOwner = collectiveTagInfo[0];
          this.updateTag(collectiveTag);
        }
      }
    }

    if (notes) {
      for (const note of notes) {
        let noteToUpdate = note;
        if (noteToUpdate.relationships) {
          this.addTagsToNote(noteToUpdate, noteToUpdate.relationships.tags);
          if (noteToUpdate.relationships) {
            if (noteToUpdate.relationships.collectiveTags) {
              for (const collectiveTagInfo of noteToUpdate.relationships.collectiveTags) {
                noteToUpdate = this.addTagsToNote(noteToUpdate, collectiveTagInfo[1], collectiveTagInfo[0]);
              }
            }
            if (noteToUpdate.relationships.assignee && assignees) {
              // Add full assignee to directly to note
              noteToUpdate.assignee =
                assignees.find((assignee) => assignee.uuid === noteToUpdate.relationships.assignee);
            }
          }
          delete noteToUpdate.relationships;
        }
        if (noteToUpdate.visibility.publicUi) {
          noteToUpdate.ui = JSON.parse(noteToUpdate.visibility.publicUi);
        }
        const staleKeywordsInNote = this.updateNote(noteToUpdate, this.updateNoteFields);
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
      this.notes.sort((note1, note2) => {
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
    oldNote.assignee = newNote.assignee;
    oldNote.ui = newNote.ui;
  }
}

export function processExternalPublicNote(publicNote: any) {
  if (publicNote.note.relationships &&
      (publicNote.note.relationships.tags || publicNote.note.relationships.collectiveTags)) {
    publicNote.note.keywords = [];

    // First: add local tags
    if (publicNote.note.relationships.tags) {
      const localKeywords = publicNote.note.relationships.tags.map(
        (tagUUID) => {
          const fullTag = publicNote.tags.find((tag) => tag.uuid === tagUUID);
          if (fullTag.parent) {
            fullTag.parentTitle =
              publicNote.tags.find((tagForParentSearch) => tagForParentSearch.uuid === fullTag.parent).title;
          }
          return fullTag;
        });
      publicNote.note.keywords.push(...localKeywords);
    }

    // Second: add collective tags
    if (publicNote.note.relationships.collectiveTags) {

      const collectiveKeywords = [];
      for (const collectiveTagInfo of publicNote.note.relationships.collectiveTags) {
        const collectiveUUID = collectiveTagInfo[0];
        const tagUUIDsForCollective = collectiveTagInfo[1];
        for (const tagUUIDForCollective of tagUUIDsForCollective) {
          const fullTagsForCollective =
            publicNote.collectiveTags
              .find((collectiveTagsInfo) => collectiveTagsInfo[0] === collectiveUUID)[1];
          const fullTag = fullTagsForCollective.find((tag) =>
            tag.uuid === tagUUIDForCollective);
          if (fullTag.parent) {
            fullTag.parentTitle = fullTagsForCollective.find(
              (tagForParentSearch) => tagForParentSearch.uuid === fullTag.parent).title;
          }
          collectiveKeywords.push(fullTag);
        }
      }
      publicNote.note.keywords.push(...collectiveKeywords);
    }

    // Third: add assignee
    if (publicNote.assignee) {
      publicNote.note.assignee = publicNote.assignee;
    }
  }
  publicNote.note.owner = {
    type: publicNote.ownerType,
    displayName: publicNote.displayName,
  };
  return publicNote.note;
}
