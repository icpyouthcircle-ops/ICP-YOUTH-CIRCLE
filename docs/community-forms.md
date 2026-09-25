# Community forms

The public portal provides two moderated forms:

- **Submit Resource** saves a private review row in `Submissions`.
- **Student Help Desk** and **Suggestions** save a private review row in `Help_Desk`.

Nothing submitted through either form is published automatically. New rows use `Pending Review`, and administrators can inspect them from the secure dashboard.

## Preferred sheet headers

The recommended `Submissions` header row is:

```text
ID	Name	Email	Title	ResourceType	Subject	Level	Description	URL	Status	SubmittedAt	CreatedAt	UpdatedAt
```

The recommended `Help_Desk` header row is:

```text
ID	Name	Email	RequestType	Subject	Message	Status	SubmittedAt	CreatedAt	UpdatedAt
```

Existing compatible headings are also supported. For example, `SubmittedBy`, `ResourceTitle`, `ResourceURL`, `Category`, `ContactEmail`, `Request`, and `Details` map to the corresponding form fields. Existing columns are preserved.

## Review workflow

Open the secure admin dashboard and choose **Resource submissions** or **Help desk**. Check the link, source, wording and permissions before copying an approved resource into the public `Resources` sheet. Keep rejected or unsafe submissions out of public content. Do not request passwords, payment information, identity documents or other unnecessary sensitive information through the help form.
