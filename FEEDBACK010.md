# improvements
## editor
- when user inputs the character "@" and then the user prompts a node label (of a persona) that is not yet in the vault, a popup should appear asking if the user wants to create a new Persona. If user chooses "yes", the new page of Persona is added

- when user inputs the string "[[" and then the user prompts a node label that is not yet in the vault, a popup should appear (just when user enters a space characters or similar after the label) asking if the user want to create a new page and which type. If user chooses "yes" and selects the type, the new page is added.

## timeline
- when enabling the timeline view, the whole width of timeline should fit in the whole width of the given frame.
- "objective" should look like a flag: a rectangle containing the objective name and a vertical marker pointing to the proper deadline in the timeline. Whenever two flags are overlapping (even just partially), stack them
- add the label of Persona just below the circle, in vertical orientation. Make them always visible
- Improve the vertical alignment of Persona: assign a rectangular space for persona that is below the rectangular space for task. The two categories must have different vertical positioning and not overlapping
- avoid overlapping between nodes, I noticed a strange overlapping with 3 tasks

# bugs
## editor
- I noticed that the "saving" of the file doesn't work anymore. I noticed it when editing a "task" note