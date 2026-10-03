# Vidly screenshots

All screenshots come from the production build with the demo data from `npm run seed`. Desktop
frames are 1440 × 900 at 2× pixel density; mobile frames are 390 × 844 at 3×.

[← Back to the README](../README.md)

## Signing in

**Sign in.** The entry point for store staff.

![Sign in](screenshots/01-sign-in.png)

**Sign-up validation.** Fields are checked as you submit, with the same rules the API enforces.

![Sign-up validation](screenshots/02-sign-up-validation.png)

## Dashboard

**Store overview.** Shows movies out, revenue, customers, stock alerts, the most-rented titles and
recent checkouts.

![Dashboard](screenshots/03-dashboard.png)

## Rentals

**Movies out now.** Each active rental shows the fee building up and how many days it has been out.

![Rentals out now](screenshots/04-rentals-out-now.png)

**Processing a return.** Lists the billable days and the exact amount due before you confirm.

![Return dialog](screenshots/05-rentals-return-dialog.png)

**Rental history.** Returned rentals with the fee that was charged.

![Rental history](screenshots/06-rentals-history.png)

**New rental: search.** Find customers and in-stock movies as you type, with full keyboard support.

![New rental search](screenshots/07-new-rental-search.png)

**New rental: summary.** Review the customer, the movie and the daily rate before checking out.

![New rental summary](screenshots/08-new-rental-summary.png)

**Checkout confirmed.** A notification confirms the checkout, and the list updates straight away.

![Checkout success](screenshots/22-checkout-success.png)

## Catalogue

**Movies.** Stock levels are colour-coded, and you can rent, edit or delete a title from each row.

![Movies](screenshots/09-movies.png)

**Filtered and sorted.** Filters and sorting are saved in the URL, so you can share or bookmark a
view.

![Movies filtered](screenshots/10-movies-filtered-sorted.png)

**Editing a movie.**

![Edit movie](screenshots/11-movie-edit.png)

**Errors from the server appear on the field.** For example, a duplicate title is rejected by the
database and the message shows under the Title field.

![Duplicate title](screenshots/12-movie-duplicate-error.png)

**Genres.** Each genre shows how many movies use it. A genre that is in use can't be deleted.

![Genres](screenshots/13-genres.png)

**Renaming a genre.** The new name is applied to every movie in that genre.

![Rename genre](screenshots/14-genre-rename-dialog.png)

## Customers

**Customers.** Contact details, gold membership and how many movies each customer has out.

![Customers](screenshots/15-customers.png)

**Gold members only.**

![Gold filter](screenshots/16-customers-gold-filter.png)

**Customer details.** Edit the customer's details and see their full rental history.

![Customer detail](screenshots/17-customer-detail.png)

## Staff and accounts

**Staff management.** For administrators only.

![Staff](screenshots/18-staff.png)

**Promoting a clerk.**

![Promote dialog](screenshots/19-staff-promote-dialog.png)

**Your account.** Change your name or password.

![Profile](screenshots/20-profile.png)

**Role-based access.** Clerks don't see the Staff area and get a clear message if they open it
directly.

![Access denied](screenshots/23-clerk-access-denied.png)

**Not found.**

![Not found](screenshots/21-not-found.png)

## Mobile

| Dashboard                                                | Rentals                                              | Movies                                             | Navigation                                                 |
| -------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| ![Mobile dashboard](screenshots/24-mobile-dashboard.png) | ![Mobile rentals](screenshots/25-mobile-rentals.png) | ![Mobile movies](screenshots/26-mobile-movies.png) | ![Mobile navigation](screenshots/27-mobile-navigation.png) |
